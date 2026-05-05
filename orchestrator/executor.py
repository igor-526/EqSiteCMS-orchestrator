import shutil
import subprocess
import sys
from typing import Dict, Any

from orchestrator.task import Task, TaskStatus
from orchestrator.config import AGENT_MODELS, EXIT_CODE_MAP


class CLIExecutor:
    """
    Executes a task by delegating it to Cursor CLI (agent -p/--print, --model).
    """
    CLI_CANDIDATES = ("agent", "cursor", "cursor-cli")

    def __init__(self, workspace_dir: str):
        self.workspace_dir = workspace_dir

    def _get_cli_executable(self) -> str:
        """Resolve Cursor CLI executable from PATH (no shell)."""
        for name in self.CLI_CANDIDATES:
            path = shutil.which(name)
            if path:
                return path
        return "agent"  # fallback so error message is clear

    def execute(self, task: Task, context: Dict[str, Any]) -> Task:
        """
        Executes the given task via Cursor CLI (non-interactive: -p, --model).
        """
        model = AGENT_MODELS.get(task.agent_role, "auto")
        cli = self._get_cli_executable()

        # Cursor CLI: -p/--print = prompt (no shell, no escaping)
        argv = [cli, "-p", task.description, "--model", model, "--trust"]

        print(f"\n[{task.agent_role}] Executing Task: {task.id}")
        print(f"[{task.agent_role}] Command: {cli} -p <prompt> --model {model}")

        task.status = TaskStatus.IN_PROGRESS

        try:
            process = subprocess.Popen(
                argv,
                cwd=self.workspace_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                shell=False,
                bufsize=1
            )
            
            stdout_lines = []
            if process.stdout:
                for line in process.stdout:
                    sys.stdout.write(line)
                    sys.stdout.flush()
                    stdout_lines.append(line)
                    
            process.wait()
            
            stdout_str = "".join(stdout_lines)
            
            if process.returncode == 0:
                task.status = TaskStatus.COMPLETED
                task.result = {"stdout": stdout_str, "stderr": ""}
            else:
                task.status = TaskStatus.FAILED
                exit_msg = EXIT_CODE_MAP.get(process.returncode, "Unknown system error")
                error_msg = f"CLI returned {process.returncode}: {exit_msg}"
                
                if stdout_str.strip():
                    error_msg += f"\n\nCaptured Output:\n{stdout_str.strip()}"
                
                if process.returncode == 127:
                    error_msg += (
                        "\n\nHint: Install Cursor CLI to PATH: in Cursor press Cmd/Ctrl+Shift+P "
                        "and run 'Install \"cursor\" command to PATH'. The CLI may appear as 'agent' or 'cursor'."
                    )
                
                task.result = {
                    "stdout": stdout_str, 
                    "stderr": "", 
                    "error": error_msg,
                    "exit_code": process.returncode
                }
                
        except Exception as e:
            task.status = TaskStatus.FAILED
            task.result = {"error": str(e)}

        return task
