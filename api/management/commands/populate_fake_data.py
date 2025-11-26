from django.core.management.base import BaseCommand
from seaflow.models import Dag, Node, Action, Task, Step
from seaflow.consts import ActionTypes, TaskStates, StepStates
from django.utils import timezone
import json
import random

class Command(BaseCommand):
    help = 'Populates the database with fake DAGs and Tasks'

    def handle(self, *args, **options):
        self.stdout.write('Creating fake data...')

        # 1. Create Actions
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SHOW CREATE TABLE seaflow_task;")
            print(cursor.fetchall()[0][1])

        action_python, _ = Action.objects.get_or_create(
            name='python_script',
            defaults={
                'title': 'Python Script',
                'type': ActionTypes.Default.name,
                'input_def': {'code': 'string'},
                'output_def': {'result': 'string'}
            }
        )
        
        action_bash, _ = Action.objects.get_or_create(
            name='bash_script',
            defaults={
                'title': 'Bash Script',
                'type': ActionTypes.Default.name,
                'input_def': {'command': 'string'},
                'output_def': {'stdout': 'string'}
            }
        )

        # 2. Create DAG 1: Linear Flow
        dag1, _ = Dag.objects.get_or_create(
            name='data_processing_pipeline',
            defaults={
                'title': 'Data Processing Pipeline',
                'version': 1,
                'latest': True
            }
        )
        
        # Nodes for DAG 1
        node1_1, _ = Node.objects.get_or_create(
            name='extract',
            dag=dag1,
            root_dag=dag1,
            defaults={
                'title': 'Extract Data',
                'action': action_python,
                'action_type': ActionTypes.Default.name
            }
        )
        
        node1_2, _ = Node.objects.get_or_create(
            name='transform',
            dag=dag1,
            root_dag=dag1,
            defaults={
                'title': 'Transform Data',
                'action': action_python,
                'action_type': ActionTypes.Default.name
            }
        )
        
        node1_3, _ = Node.objects.get_or_create(
            name='load',
            dag=dag1,
            root_dag=dag1,
            defaults={
                'title': 'Load Data',
                'action': action_bash,
                'action_type': ActionTypes.Default.name
            }
        )

        # Edges for DAG 1
        node1_2.previous_nodes.add(node1_1)
        node1_3.previous_nodes.add(node1_2)

        # 3. Create DAG 2: Branching Flow
        dag2, _ = Dag.objects.get_or_create(
            name='ml_training_workflow',
            defaults={
                'title': 'ML Training Workflow',
                'version': 1,
                'latest': True
            }
        )

        node2_1, _ = Node.objects.get_or_create(
            name='fetch_dataset',
            dag=dag2,
            root_dag=dag2,
            defaults={'title': 'Fetch Dataset', 'action': action_bash, 'action_type': ActionTypes.Default.name}
        )
        
        node2_2a, _ = Node.objects.get_or_create(
            name='train_model_a',
            dag=dag2,
            root_dag=dag2,
            defaults={'title': 'Train Model A', 'action': action_python, 'action_type': ActionTypes.Default.name}
        )
        
        node2_2b, _ = Node.objects.get_or_create(
            name='train_model_b',
            dag=dag2,
            root_dag=dag2,
            defaults={'title': 'Train Model B', 'action': action_python, 'action_type': ActionTypes.Default.name}
        )
        
        node2_3, _ = Node.objects.get_or_create(
            name='evaluate',
            dag=dag2,
            root_dag=dag2,
            defaults={'title': 'Evaluate Models', 'action': action_python, 'action_type': ActionTypes.Default.name}
        )

        node2_2a.previous_nodes.add(node2_1)
        node2_2b.previous_nodes.add(node2_1)
        node2_3.previous_nodes.add(node2_2a, node2_2b)

        # 4. Create Tasks (Executions)
        # Task 1: Success
        task1 = Task.objects.create(
            name=dag1.name,
            title=dag1.title,
            dag=dag1,
            state=TaskStates.SUCCESS.name,
            input={'source': 's3://bucket/data.csv'},
            start_time=timezone.now() - timezone.timedelta(minutes=10),
            end_time=timezone.now() - timezone.timedelta(minutes=5),
            duration=300.0
        )
        task1.root = task1
        task1.save()

        # Task 2: Running
        task2 = Task.objects.create(
            name=dag2.name,
            title=dag2.title,
            dag=dag2,
            state=TaskStates.PROCESSING.name,
            input={'dataset_version': 'v2'},
            start_time=timezone.now() - timezone.timedelta(minutes=2),
            duration=120.0
        )
        task2.root = task2
        task2.save()

        # Task 3: Failed
        task3 = Task.objects.create(
            name=dag1.name,
            title=dag1.title,
            dag=dag1,
            state=TaskStates.ERROR.name,
            input={'source': 'invalid_path'},
            start_time=timezone.now() - timezone.timedelta(hours=1),
            end_time=timezone.now() - timezone.timedelta(minutes=59),
            duration=60.0,
            error='FileNotFoundError: invalid_path'
        )
        task3.root = task3
        task3.save()

        # 5. Create Steps for Tasks
        # Steps for Task 1 (Success)
        t1_s1 = Step.objects.create(
            task=task1,
            root=task1,
            node=node1_1,
            name=node1_1.name,
            title=node1_1.title,
            state=StepStates.SUCCESS.name,
            start_time=task1.start_time,
            end_time=task1.start_time + timezone.timedelta(minutes=1),
            duration=60.0,
            input={'source': 's3://bucket/data.csv'},
            output={'data_frame': 'df_object_ref'},
            logs=['Connecting to S3...', 'Downloading data...', 'Data extracted successfully.']
        )
        
        t1_s2 = Step.objects.create(
            task=task1,
            root=task1,
            node=node1_2,
            name=node1_2.name,
            title=node1_2.title,
            state=StepStates.SUCCESS.name,
            start_time=task1.start_time + timezone.timedelta(minutes=1),
            end_time=task1.start_time + timezone.timedelta(minutes=3),
            duration=120.0,
            input={'data_frame': 'df_object_ref'},
            output={'transformed_df': 'df_clean_ref'},
            logs=['Cleaning data...', 'Applying transformations...', 'Data transformed.']
        )
        t1_s2.previous_steps.add(t1_s1)

        t1_s3 = Step.objects.create(
            task=task1,
            root=task1,
            node=node1_3,
            name=node1_3.name,
            title=node1_3.title,
            state=StepStates.SUCCESS.name,
            start_time=task1.start_time + timezone.timedelta(minutes=3),
            end_time=task1.end_time,
            duration=120.0,
            input={'transformed_df': 'df_clean_ref'},
            output={'db_status': 'inserted'},
            logs=['Connecting to DB...', 'Inserting records...', 'Load complete.']
        )
        t1_s3.previous_steps.add(t1_s2)

        # Steps for Task 2 (Running)
        t2_s1 = Step.objects.create(
            task=task2,
            root=task2,
            node=node2_1,
            name=node2_1.name,
            title=node2_1.title,
            state=StepStates.SUCCESS.name,
            start_time=task2.start_time,
            end_time=task2.start_time + timezone.timedelta(minutes=1),
            duration=60.0,
            input={'dataset_version': 'v2'},
            output={'dataset_path': '/tmp/data_v2'},
            logs=['Fetching dataset v2...', 'Download complete.']
        )

        t2_s2a = Step.objects.create(
            task=task2,
            root=task2,
            node=node2_2a,
            name=node2_2a.name,
            title=node2_2a.title,
            state=StepStates.PROCESSING.name,
            start_time=task2.start_time + timezone.timedelta(minutes=1),
            duration=60.0,
            input={'dataset_path': '/tmp/data_v2', 'model': 'A'},
            logs=['Initializing Model A...', 'Training epoch 1/10...']
        )
        t2_s2a.previous_steps.add(t2_s1)

        t2_s2b = Step.objects.create(
            task=task2,
            root=task2,
            node=node2_2b,
            name=node2_2b.name,
            title=node2_2b.title,
            state=StepStates.PENDING.name,
            input={'dataset_path': '/tmp/data_v2', 'model': 'B'}
        )
        t2_s2b.previous_steps.add(t2_s1)

        # Steps for Task 3 (Failed)
        t3_s1 = Step.objects.create(
            task=task3,
            root=task3,
            node=node1_1,
            name=node1_1.name,
            title=node1_1.title,
            state=StepStates.SUCCESS.name,
            start_time=task3.start_time,
            end_time=task3.start_time + timezone.timedelta(seconds=30),
            duration=30.0,
            input={'source': 'invalid_path'},
            output={'data': 'partial'},
            logs=['Attempting extraction...']
        )

        t3_s2 = Step.objects.create(
            task=task3,
            root=task3,
            node=node1_2,
            name=node1_2.name,
            title=node1_2.title,
            state=StepStates.ERROR.name,
            start_time=task3.start_time + timezone.timedelta(seconds=30),
            end_time=task3.end_time,
            duration=30.0,
            input={'data': 'partial'},
            logs=['Starting transform...', 'Error: Invalid data format', 'Traceback...'],
            error='ValueError: Invalid format'
        )
        t3_s2.previous_steps.add(t3_s1)

        self.stdout.write(self.style.SUCCESS('Successfully created fake data'))
