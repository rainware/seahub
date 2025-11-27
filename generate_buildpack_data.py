import sys
import os
import django
import random
from datetime import datetime, timedelta

sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "seahub.settings")
django.setup()

from seaflow.models import Dag, Task, Step, Node
from seaflow.consts import TaskStates, StepStates

def create_task_data(dag_name="BuildPack"):
    try:
        root_dag = Dag.objects.get(name=dag_name)
    except Dag.DoesNotExist:
        print(f"DAG {dag_name} not found!")
        return

    print(f"Generating data for DAG: {root_dag.name}")

    # Create Root Task
    root_task = Task.objects.create(
        name=f"Task-{root_dag.name}-{random.randint(1000, 9999)}",
        title=f"Run {root_dag.title}",
        dag=root_dag,
        state=TaskStates.PROCESSING.name,
        start_time=datetime.now(),
        input={"env": "prod", "version": "1.0.0"},
        context={},
        output={},
    )

    # Map to store created steps and tasks for linking
    # Key: f"node-{node_id}" or f"dag-{dag_id}" -> Value: List of Step objects or Task objects
    created_components = {}

    def process_dag(current_dag, current_task):
        # 1. Create Steps for Nodes
        for node in current_dag.nodes.all():
            # Special handling for "构建" node to simulate fission
            if node.title == '构建':
                node.fissionable = True
                node.save()
                fission_count = 3
            else:
                fission_count = 1

            steps = []
            for i in range(fission_count):
                step = Step.objects.create(
                    identifier=f"step-{node.id}-{i}", # Unique identifier
                    name=node.name,
                    title=f"{node.title} ({i})" if fission_count > 1 else node.title,
                    node=node,
                    root=root_task,
                    task=current_task,
                    state=random.choice([s.name for s in StepStates]),
                    start_time=datetime.now(),
                    end_time=datetime.now() + timedelta(seconds=random.randint(1, 60)),
                    duration=random.randint(1, 60),
                    input={"data": "test"},
                    output={"result": "ok"},
                    fission_index=i,
                    fission_count=fission_count
                )
                steps.append(step)
            
            created_components[f"node-{node.id}"] = steps

        # 2. Create Sub-Tasks for Sub-DAGs
        for sub_dag in Dag.objects.filter(parent=current_dag):
            sub_task = Task.objects.create(
                name=sub_dag.name,
                title=sub_dag.title,
                dag=sub_dag,
                parent=current_task,
                root=root_task,
                state=random.choice([s.name for s in TaskStates]),
                start_time=datetime.now(),
                end_time=datetime.now() + timedelta(seconds=random.randint(60, 300)),
                duration=random.randint(60, 300),
                input={},
                output={},
            )
            created_components[f"dag-{sub_dag.id}"] = [sub_task]
            
            # Recursively process sub-dag
            process_dag(sub_dag, sub_task)

        # 3. Link Components (Steps and Sub-Tasks)
        # We need to link them based on the DAG's structure
        
        # Link Steps
        for node in current_dag.nodes.all():
            current_steps = created_components.get(f"node-{node.id}")
            if not current_steps: continue

            for step in current_steps:
                # Link previous nodes -> previous steps
                for prev_node in node.previous_nodes.all():
                    prev_steps = created_components.get(f"node-{prev_node.id}")
                    if prev_steps:
                        for prev_step in prev_steps:
                            step.previous_steps.add(prev_step)
                
                # Link previous dags -> previous tasks
                for prev_dag in node.previous_dags.all():
                    prev_tasks = created_components.get(f"dag-{prev_dag.id}")
                    if prev_tasks:
                        for prev_task in prev_tasks:
                            step.previous_tasks.add(prev_task)
        
        # Link Sub-Tasks
        for sub_dag in Dag.objects.filter(parent=current_dag):
            sub_tasks = created_components.get(f"dag-{sub_dag.id}")
            if not sub_tasks: continue

            for sub_task in sub_tasks:
                # Link previous nodes -> previous steps
                for prev_node in sub_dag.previous_nodes.all():
                    prev_steps = created_components.get(f"node-{prev_node.id}")
                    if prev_steps:
                        for prev_step in prev_steps:
                            sub_task.previous_steps.add(prev_step)

                # Link previous dags -> previous tasks
                for prev_dag in sub_dag.previous_dags.all():
                    prev_tasks = created_components.get(f"dag-{prev_dag.id}")
                    if prev_tasks:
                        for prev_task in prev_tasks:
                            sub_task.previous_tasks.add(prev_task)

    process_dag(root_dag, root_task)
    print(f"Successfully created Task ID: {root_task.id}")

if __name__ == "__main__":
    create_task_data()
