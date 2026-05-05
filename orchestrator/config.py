"""
Configuration for the orchestrator and agents.
"""
import os

# Default model assignments per agent role
AGENT_MODELS = {
    # "Planner": "composer-1.5",
    # "Quality Gate": "composer-1.5",
    "Planner": "auto",
    "Quality Gate": "auto",
    "Backend": "auto",
    "Frontend": "auto",
    "Router": "auto"
}

# Cursor CLI: use -p/--print for prompt (non-interactive), --model for model.
# See https://cursor.com/docs/cli/reference/parameters

# Limits to prevent infinite loops from dynamic task generation
MAX_ITERATIONS_PER_TASK_LINEAGE = 3

# Paths relative to the workspace root
PLANS_DIR = os.path.join("docs", "plans")
TASKS_DIR = os.path.join("docs", "tasks")

# Common CLI exit codes and their meanings
EXIT_CODE_MAP = {
    1: "General error (often application-specific)",
    2: "Misuse of shell builtins (or invalid arguments)",
    126: "Command invoked cannot execute (permission problem or not an executable)",
    127: "Command not found (check your PATH)",
    128: "Invalid argument to exit",
    130: "Script terminated by Control-C",
    133: "SIGTRAP (Trace/breakpoint trap). Common in AppImages when environment is restricted or sandboxed.",
    137: "Fatal error signal 9 (OOM Killer or manual kill)",
    139: "Segmentation fault",
    143: "Terminated by SIGTERM",
}

