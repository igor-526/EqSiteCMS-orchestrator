import argparse
import os
import sys

from dotenv import load_dotenv

from orchestrator.task import Task
from orchestrator.pipeline import Orchestrator

def setup_git_branch(task_id: str, prompt: str, workspace_dir: str):
    import re
    import subprocess
    
    # Create a short slug from the prompt
    # Transliteration or basic cleansing for the branch name
    slug = re.sub(r'[^a-zA-Z0-9\s]', '', prompt.lower()).strip()
    slug = re.sub(r'\s+', '-', slug)[:30].strip('-')
    if not slug:
        slug = "task"
        
    branch_name = f"feature/{task_id.lower()}-{slug}"
    
    print(f"Setting up git branch: {branch_name} from origin/main")
    try:
        # Fetch latest from origin
        subprocess.run(["git", "fetch", "origin"], cwd=workspace_dir, check=False, capture_output=True)
        
        # Determine if the branch already exists
        res = subprocess.run(["git", "rev-parse", "--verify", branch_name], cwd=workspace_dir, capture_output=True)
        if res.returncode == 0:
            # Branch exists, just checkout
            subprocess.run(["git", "checkout", branch_name], cwd=workspace_dir, check=True, capture_output=True)
            print(f"Checked out existing branch: {branch_name}")
        else:
            # Try to checkout from origin/main. If it fails, fallback to local main/master or current branch
            res_main = subprocess.run(["git", "checkout", "-b", branch_name, "origin/main"], cwd=workspace_dir, capture_output=True)
            if res_main.returncode != 0:
                print("Could not checkout from origin/main. Creating from current branch.")
                subprocess.run(["git", "checkout", "-b", branch_name], cwd=workspace_dir, check=True, capture_output=True)
                
            print(f"Successfully created and checked out new branch: {branch_name}")
            
    except subprocess.CalledProcessError as e:
        err_msg = e.stderr.decode('utf-8') if e.stderr else str(e)
        print(f"Warning: Failed to setup git branch: {err_msg}")
        print("Continuing on current branch...")

def main():
    load_dotenv()

    parser = argparse.ArgumentParser(description="EqSiteCMS Agent Orchestrator")
    parser.add_argument("--task-id", required=True, help="Task ID (e.g. NEX-132)")
    parser.add_argument("--prompt", required=True, help="Task description prompt")
    
    args = parser.parse_args()
    
    if not args.prompt:
        print("Error: Task prompt cannot be empty.")
        sys.exit(1)
    
    workspace_dir = os.getcwd()
    orchestrator = Orchestrator(workspace_dir=workspace_dir)
    orchestrator.base_task_id = args.task_id
    
    # 0. Setup Git Branch
    setup_git_branch(args.task_id, args.prompt, workspace_dir)
    
    # Initialize the graph
    planner_id = f"{args.task_id}-Planner"
    backend_id = f"{args.task_id}-Backend"
    frontend_id = f"{args.task_id}-Frontend"
    qa_id = f"{args.task_id}-Quality Gate"
    
    # 1. Planner
    t_planner = Task(
        id=planner_id,
        description=(
            f"Plan this task and write a standard checklist to docs/plans/{args.task_id}.md: {args.prompt}\n"
            "CRITICAL: You MUST group your checklist items under exact English headers matching the agent roles: "
            "'### Backend', '### Frontend', and '### Quality Gate'. "
            "Our parser relies on these exact headers to track completion."
        ),
        agent_role="Planner",
        dependencies=[]
    )
    
    # 2. Backend
    t_backend = Task(
        id=backend_id,
        description=f"Implement backend part of {args.task_id} according to the completed plan. IMPORTANT: Update the checklist in docs/plans/{args.task_id}.md by changing [ ] to [x] for the tasks you complete.",
        agent_role="Backend",
        dependencies=[planner_id]
    )
    
    # 3. Frontend
    t_frontend = Task(
        id=frontend_id,
        description=f"Implement frontend part of {args.task_id} according to the completed plan. IMPORTANT: Update the checklist in docs/plans/{args.task_id}.md by changing [ ] to [x] for the tasks you complete.",
        agent_role="Frontend",
        dependencies=[planner_id]
    )
    
    # 4. Quality Gate
    t_qa = Task(
        id=qa_id,
        description=f"Review code and diffs for backend and frontend implementation. Verify correctness.",
        agent_role="Quality Gate",
        dependencies=[backend_id, frontend_id]
    )
    
    orchestrator.add_task(t_planner)
    orchestrator.add_task(t_backend)
    orchestrator.add_task(t_frontend)
    orchestrator.add_task(t_qa)
    
    orchestrator.run()

if __name__ == "__main__":
    main()
