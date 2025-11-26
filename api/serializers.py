from rest_framework import serializers
from seaflow.models import Dag, Task, Node, Step, Action

class ActionSerializer(serializers.ModelSerializer):
    title = serializers.CharField(required=False)
    type = serializers.CharField(required=False)

    class Meta:
        model = Action
        fields = '__all__'

    def validate(self, data):
        if 'title' not in data or not data['title']:
            data['title'] = data.get('name', '')
        if 'type' not in data or not data['type']:
            data['type'] = 'Default'
        return data

class NodeSerializer(serializers.ModelSerializer):
    previous_nodes = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    
    class Meta:
        model = Node
        fields = ['id', 'name', 'title', 'previous_nodes', 'action_type', 'input_def', 'output_def']

class StepSerializer(serializers.ModelSerializer):
    previous_steps = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta:
        model = Step
        fields = ['id', 'name', 'title', 'state', 'start_time', 'end_time', 'duration', 'input', 'output', 'logs', 'error', 'previous_steps']

class DAGSerializer(serializers.ModelSerializer):
    components = serializers.SerializerMethodField()

    class Meta:
        model = Dag
        fields = '__all__'

    def get_components(self, obj):
        nodes = obj.nodes.all()
        components = []
        
        # Add nodes
        for node in nodes:
            components.append({
                'identifier': f'node-{node.id}',
                'kind': 'Node',
                'name': node.name,
                'title': node.title,
                'action': node.action.name if node.action else None,
                'action_type': node.action_type,
                'action_detail': ActionSerializer(node.action).data if node.action else None,
                'fissionable': node.fissionable,
                'fission_config': node.fission_config if node.fissionable else None,
                'iterable': node.iterable,
                'iter_config': node.iter_config if node.iterable else None,
                'loopable': node.loopable,
                'loop_config': node.loop_config if node.loopable else None,
                'input_adapter': node.input_adapter,
                'output_adapter': node.output_adapter,
                'previous_nodes': [f'node-{n.id}' for n in node.previous_nodes.all()]
            })
        
        # Add sub-DAGs
        sub_dags = Dag.objects.filter(parent=obj)
        for sub_dag in sub_dags:
            # Recursively get components for sub-dag
            sub_components = self.get_components(sub_dag)
            
            components.append({
                'identifier': f'dag-{sub_dag.id}',
                'kind': 'Dag',
                'name': sub_dag.name,
                'title': sub_dag.title,
                'previous_dags': [f'dag-{d.id}' for d in sub_dag.previous_dags.all()],
                'previous_nodes': [f'node-{n.id}' for n in sub_dag.previous_nodes.all()],
                # Include child nodes for grouping (IDs only, for reference)
                'child_nodes': [f'node-{n.id}' for n in sub_dag.nodes.all()],
                # Include full components definition recursively
                'components': sub_components
            })
        
        return components

class TaskSerializer(serializers.ModelSerializer):
    dag = DAGSerializer(read_only=True)
    steps = StepSerializer(many=True, read_only=True)
    components = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = '__all__'

    def get_components(self, obj):
        steps = obj.steps.all()
        components = []
        
        # Add steps
        for step in steps:
            components.append({
                'identifier': f'step-{step.id}',
                'kind': 'Step',
                'name': step.name,
                'title': step.title,
                'state': step.state,
                'state_display': step.get_state_display(),
                'start_time': step.start_time,
                'end_time': step.end_time,
                'duration': step.duration,
                'input': step.input,
                'output': step.output,
                'logs': step.logs,
                'error': step.error,
                'previous_steps': [f'step-{s.id}' for s in step.previous_steps.all()],
                'previous_tasks': [f'task-{t.id}' for t in step.previous_tasks.all()],
            })
        
        # Add sub-tasks
        sub_tasks = Task.objects.filter(parent=obj)
        for sub_task in sub_tasks:
            # Recursively get components for sub-task
            sub_components = self.get_components(sub_task)
            
            components.append({
                'identifier': f'task-{sub_task.id}',
                'kind': 'Task',
                'name': sub_task.name,
                'title': sub_task.title,
                'state': sub_task.state,
                'state_display': sub_task.get_state_display(),
                'previous_tasks': [f'task-{t.id}' for t in sub_task.previous_tasks.all()],
                'previous_steps': [f'step-{s.id}' for s in sub_task.previous_steps.all()],
                # Include child steps for grouping (IDs only, for reference)
                'child_steps': [f'step-{s.id}' for s in sub_task.steps.all()],
                # Include full components definition recursively
                'components': sub_components
            })
        
        return components
