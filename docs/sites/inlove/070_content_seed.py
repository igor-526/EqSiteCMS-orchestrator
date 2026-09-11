"""Scoped local seed. Run with python3; --rollback restores the first snapshot."""
import json
import subprocess
import sys
import uuid
from pathlib import Path

BASE = Path(__file__).with_suffix('')
BACKUP = BASE.with_suffix('.backup.json')
TENANT = '685c6079-3922-4dbb-95b6-533bc9060547'
NEWS = [
    ('znakomstvo', 'Знакомство с клубом', 'Первый шаг к знакомству с миром лошадей.', 'Знакомство с конным клубом начинается с простого интереса к лошадям. На сайте можно прочитать о клубе и выбрать вопросы для первого разговора: о формате занятий, подготовке и записи.'),
    ('pered-vizitom', 'Перед первым визитом', 'Какие вопросы можно обсудить с клубом заранее.', 'Перед поездкой удобно уточнить маршрут, время визита и подходящий формат знакомства с клубом. Расскажите о своём опыте и ожиданиях, а вопросы об одежде и подготовке обсудите при записи.'),
    ('mir-loshadey', 'Ближе к миру лошадей', 'Небольшая редакционная заметка о знакомстве с лошадьми.', 'Наблюдать за лошадьми, узнавать их привычки и учиться понимать движения — часть знакомства с конным миром. Внимание, терпение и уважение к животному помогают сделать это знакомство осмысленным.'),
]
SETTINGS = {
    'about.intro': ('string', '«ИНЛав» — конный клуб в деревне Иннолово. В основе его замысла — уютное место с доброй атмосферой, где знакомство с лошадьми становится частью жизни. Здесь начинается разговор о верховой езде, внимании к животным и радости общения с ними.'),
    'about.setting': ('string', 'В материалах о клубе и отзывах гостей встречаются озеро, зелёные пастбища, лесная трасса и крытый манеж. Эти детали складываются в образ загородного места рядом с природой. Актуальную доступность площадок и подходящий формат визита можно уточнить при записи.'),
    'about.features': ('object', json.dumps([
        {'id': 'atmosphere', 'label': 'Добрая атмосфера', 'value': 'Уютный клуб с доброй атмосферой — замысел, которым команда делится в описании «ИНЛав».', 'approved': True},
        {'id': 'attention', 'label': 'Внимание к всаднику', 'value': 'В отзывах гости отмечают индивидуальный подход тренеров и поддержку во время знакомства с верховой ездой.', 'approved': True},
        {'id': 'nature', 'label': 'Рядом с природой', 'value': 'Озеро, пастбища и лесная трасса — образы, которые гости упоминают в рассказах о клубе.', 'approved': True},
    ], ensure_ascii=False)),
}

def quote(value):
    return 'NULL' if value is None else "'" + str(value).replace("'", "''") + "'"

container = json.loads(subprocess.check_output(['docker', 'inspect', 'eqsitecms-db']))[0]
env = dict(item.split('=', 1) for item in container['Config']['Env'])
command = ['docker', 'exec', '-i', 'eqsitecms-db', 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', env.get('POSTGRES_USER', 'postgres'), '-d', env.get('POSTGRES_DB', 'postgres'), '-At']

def sql(query):
    return subprocess.check_output(command, input=query, text=True).strip()

def rows(query):
    return json.loads(sql('SELECT coalesce(json_agg(t),\'[]\'::json) FROM (' + query + ') t;'))

assert rows("SELECT id,name FROM equestrians WHERE service_key='inlove'") == [{'id': TENANT, 'name': 'Конный клуб «ИНЛав»'}], 'Tenant identity mismatch'
ids = [str(uuid.uuid5(uuid.NAMESPACE_URL, f'eqsitecms/inlove/070/mock/{item[0]}')) for item in NEWS]
keylist = ','.join(map(quote, SETTINGS))
idlist = ','.join(map(quote, ids))
if not BACKUP.exists():
    assert '--rollback' not in sys.argv
    snapshot = {'tenant_id': TENANT, 'news_ids': ids, 'settings': rows(f'SELECT * FROM site_settings WHERE equestrian_id={quote(TENANT)} AND key IN ({keylist})'), 'previous_news': rows(f'SELECT * FROM news WHERE equestrian_id={quote(TENANT)} AND id IN ({idlist})')}
    assert not snapshot['previous_news'], 'Seed IDs already exist without backup'
    BACKUP.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
snapshot = json.loads(BACKUP.read_text())
assert snapshot['tenant_id'] == TENANT and snapshot['news_ids'] == ids
statements = ['BEGIN;', "SELECT pg_advisory_xact_lock(hashtext('inlove-070-content-seed'));"]
if '--rollback' in sys.argv:
    for old in snapshot['settings']:
        kind, value = SETTINGS[old['key']]
        statements.append(f"UPDATE site_settings SET value={quote(old['value'])}, type={quote(old['type'])}, updated_at={quote(old['updated_at'])} WHERE equestrian_id={quote(TENANT)} AND id={quote(old['id'])} AND value={quote(value)} AND type={quote(kind)};")
    for key, (kind, value) in SETTINGS.items():
        if key not in {old['key'] for old in snapshot['settings']}:
            statements.append(f"DELETE FROM site_settings WHERE equestrian_id={quote(TENANT)} AND key={quote(key)} AND value={quote(value)} AND type={quote(kind)};")
    for news_id, (tag, name, snippet, body) in zip(ids, NEWS):
        content = '<p><em>Демонстрационная редакционная запись.</em></p><p>' + body + '</p>'
        statements.append(f"DELETE FROM news WHERE equestrian_id={quote(TENANT)} AND id={quote(news_id)} AND name={quote(name)} AND snippet={quote(snippet)} AND content={quote(content)} AND slug={quote('inlove-070-mock-' + tag)};")
else:
    for news_id, (tag, name, snippet, body) in zip(ids, NEWS):
        slug = 'inlove-070-mock-' + tag
        content = '<p><em>Демонстрационная редакционная запись.</em></p><p>' + body + '</p>'
        statements.append(f"INSERT INTO news (id,equestrian_id,name,slug,snippet,content,published_at) VALUES ({quote(news_id)},{quote(TENANT)},{quote(name)},{quote(slug)},{quote(snippet)},{quote(content)},now()) ON CONFLICT (id) DO UPDATE SET name=excluded.name,snippet=excluded.snippet,content=excluded.content WHERE news.equestrian_id=excluded.equestrian_id AND news.slug=excluded.slug AND (news.name,news.snippet,news.content) IS DISTINCT FROM (excluded.name,excluded.snippet,excluded.content);")
    for key, (kind, value) in SETTINGS.items():
        statements.append(f"INSERT INTO site_settings (id,equestrian_id,key,name,value,type) VALUES (gen_random_uuid(),{quote(TENANT)},{quote(key)},{quote(key)},{quote(value)},{quote(kind)}) ON CONFLICT (equestrian_id,key) DO UPDATE SET value=excluded.value,type=excluded.type,updated_at=now() WHERE (site_settings.value,site_settings.type) IS DISTINCT FROM (excluded.value,excluded.type);")
statements.append('COMMIT;')
sql('\n'.join(statements))
print(json.dumps({'action': 'rollback' if '--rollback' in sys.argv else 'seed', 'tenant_id': TENANT, 'news': rows(f'SELECT id,slug,published_at FROM news WHERE equestrian_id={quote(TENANT)} AND id IN ({idlist}) ORDER BY slug'), 'settings_keys': list(SETTINGS)}, ensure_ascii=False, indent=2))
