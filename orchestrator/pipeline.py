import os
from datetime import datetime
from typing import Dict, List, Optional, Any

from orchestrator.task import Task, TaskStatus
from orchestrator.executor import CLIExecutor
from orchestrator.plan_parser import get_plan_content, verify_agent_plan_completion
from orchestrator.config import MAX_ITERATIONS_PER_TASK_LINEAGE, TASKS_DIR

class CircularDependencyError(Exception):
    pass

class Orchestrator:
    def __init__(self, workspace_dir: str):
        self.workspace_dir = workspace_dir
        self.tasks: Dict[str, Task] = {}
        self.executor = CLIExecutor(workspace_dir=workspace_dir)
        self.context: Dict[str, Any] = {}
        self.iteration_counts: Dict[str, int] = {}
        self.base_task_id: Optional[str] = None
        
    def add_task(self, task: Task):
        self.tasks[task.id] = task
        self.iteration_counts[task.id] = 0

    def _topo_sort(self) -> List[Task]:
        """Performs topological sorting. Raises CircularDependencyError if cycle found."""
        in_degree = {task_id: 0 for task_id in self.tasks}
        graph = {task_id: [] for task_id in self.tasks}

        for task_id, task in self.tasks.items():
            for dep in task.dependencies:
                if dep in self.tasks:
                    graph[dep].append(task_id)
                    in_degree[task_id] += 1

        queue = [task_id for task_id, deg in in_degree.items() if deg == 0]
        sorted_tasks = []

        while queue:
            node = queue.pop(0)
            sorted_tasks.append(self.tasks[node])
            for neighbor in graph[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(sorted_tasks) != len(self.tasks):
            raise CircularDependencyError("Cycle detected in task dependencies.")

        return sorted_tasks

    def _get_base_id(self, task_id: str) -> str:
        # e.g. "NEX-132" from "NEX-132-Backend"
        parts = task_id.split('-')
        if len(parts) >= 2:
            return f"{parts[0]}-{parts[1]}"
        return task_id
        
    def _get_agent_lineage(self, task_id: str) -> str:
        # e.g. "NEX-132-Backend" from "NEX-132-Backend-retry1"
        return task_id.split('-retry')[0]

    def run(self):
        print("Starting orchestrator pipeline...")
        
        while True:
            pending_tasks = [t for t in self.tasks.values() if t.status == TaskStatus.PENDING]
            if not pending_tasks:
                print("All tasks processed.")
                break
                
            try:
                sorted_tasks = self._topo_sort()
            except CircularDependencyError as e:
                print(f"Error: {e}")
                return

            ready_tasks = []
            for t in sorted_tasks:
                if t.status == TaskStatus.PENDING:
                    deps_met = all(self.tasks[d].status == TaskStatus.COMPLETED for d in t.dependencies if d in self.tasks)
                    if deps_met:
                        ready_tasks.append(t)

            if not ready_tasks:
                # Need to check if a task is blocked due to failure
                failed_tasks = [t for t in self.tasks.values() if t.status == TaskStatus.FAILED]
                if failed_tasks:
                    print("Pipeline blocked by FAILED tasks.")
                else:
                    print("Pipeline blocked unexpectedly. Unresolved dependencies.")
                break

            for task in ready_tasks:
                if not self.base_task_id:
                    self.base_task_id = self._get_base_id(task.id)
                    
                self._execute_task(task)

        self._generate_report()

    def _execute_task(self, task: Task):
        # 1. Execute task
        task = self.executor.execute(task, self.context)
        
        # 2. Add to context
        self.context[task.id] = task.result

        # 3. Plan Verification Loop
        if task.status == TaskStatus.COMPLETED and "planner" not in task.agent_role.lower():
            base_id = self._get_base_id(task.id)
            plan_content = get_plan_content(base_id, self.workspace_dir)
            
            if plan_content:
                missing_items = verify_agent_plan_completion(task.agent_role, plan_content)
                if missing_items:
                    print(f"[{task.agent_role}] Missing items found: {missing_items}")
                    
                    lineage_id = self._get_agent_lineage(task.id)
                    current_iter = self.iteration_counts.get(lineage_id, 0)
                    
                    if current_iter >= MAX_ITERATIONS_PER_TASK_LINEAGE:
                        print(f"[{task.agent_role}] Max iterations reached for {lineage_id}. Failing task.")
                        task.status = TaskStatus.FAILED
                    else:
                        print(f"[{task.agent_role}] Respawning task due to incomplete plan items...")
                        self.iteration_counts[lineage_id] = current_iter + 1
                        retry_id = f"{lineage_id}-retry{current_iter + 1}"
                        retry_desc = (
                            f"You forgot to finish these items from the plan:\n" 
                            + "\n".join(f"- {item}" for item in missing_items) 
                            + "\nResume work and mark them as [x] in the plan when done."
                        )
                        
                        retry_task = Task(
                            id=retry_id,
                            description=retry_desc,
                            agent_role=task.agent_role,
                            dependencies=[task.id]
                        )
                        self.tasks[retry_id] = retry_task
                        
                        for downstream_t in self.tasks.values():
                            if downstream_t.id != retry_id and task.id in downstream_t.dependencies:
                                downstream_t.dependencies.remove(task.id)
                                downstream_t.dependencies.append(retry_id)

    def _generate_report(self):
        print("\n--- Generating Report ---")
        if not self.base_task_id:
            print("No tasks executed, skipping report.")
            return
            
        report_path = os.path.join(self.workspace_dir, TASKS_DIR, f"{self.base_task_id}-report.md")
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(f"# Execution Report for {self.base_task_id}\n\n")
            f.write(f"Generated at: {datetime.now().isoformat()}\n\n")
            
            for task_id, task in self.tasks.items():
                f.write(f"## {task_id} ({task.agent_role})\n")
                status_icon = "✅" if task.status == TaskStatus.COMPLETED else "❌" if task.status == TaskStatus.FAILED else "⏳"
                f.write(f"- **Status**: {status_icon} {task.status.value}\n")
                f.write(f"- **Dependencies**: {', '.join(task.dependencies) if task.dependencies else 'None'}\n")
                f.write(f"- **Description**: {task.description}\n")
                
                if task.result and isinstance(task.result, dict):
                    if task.result.get('error'):
                        f.write(f"\n**Error:**\n```\n{task.result.get('error')}\n```\n")
                f.write("\n")
                
        print(f"Report saved to {report_path}")
