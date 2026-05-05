import os
import re
from typing import List

def get_plan_path(task_id: str, workspace_dir: str) -> str:
    """Returns the absolute path to the task's plan markdown file."""
    # First check docs/plans/{task_id}.md
    path = os.path.join(workspace_dir, "docs", "plans", f"{task_id}.md")
    if not os.path.exists(path):
        # Fallback to docs/tasks
        path = os.path.join(workspace_dir, "docs", "tasks", f"{task_id}.md")
    return path

def get_plan_content(task_id: str, workspace_dir: str) -> str:
    """Reads the task's plan markdown file and returns its content."""
    path = get_plan_path(task_id, workspace_dir)
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    return ""


def verify_agent_plan_completion(agent_role: str, plan_md_content: str) -> List[str]:
    """
    Parses the structured plan markdown to find unchecked items [ ] 
    specifically for the given agent_role.
    
    Returns a list of descriptions of the uncompleted items.
    """
    if not plan_md_content:
        return []

    out = []
    lines = plan_md_content.split('\n')
    in_agent_section = False
    
    # We define known agents to detect section boundaries
    known_agents = ['planner', 'quality gate', 'backend', 'frontend', 'router']
    
    for line in lines:
        if line.startswith('#'):
            line_lower = line.lower()
            if agent_role.lower() in line_lower:
                in_agent_section = True
            elif any(a in line_lower for a in known_agents if a != agent_role.lower()):
                # We reached another agent's section, stop collecting
                in_agent_section = False
                
        if in_agent_section:
            match = re.search(r'^\s*[-*]\s*\[\s*\]\s*(.*)', line)
            if match:
                out.append(match.group(1).strip())
                
    return out
