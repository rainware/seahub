from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from seaflow.models import Dag, Task, Action
from .serializers import DAGSerializer, TaskSerializer, ActionSerializer
from seaflow.base import Seaflow
from .pagination import StandardResultsSetPagination
import json

class ActionViewSet(viewsets.ModelViewSet):
    queryset = Action.objects.all().order_by('-id')
    serializer_class = ActionSerializer
    pagination_class = StandardResultsSetPagination

    def create(self, request, *args, **kwargs):
        if isinstance(request.data, list):
            serializer = self.get_serializer(data=request.data, many=True)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            return Response(serializer.data, status=201)
        return super().create(request, *args, **kwargs)

class DAGViewSet(viewsets.ModelViewSet):
    queryset = Dag.objects.all().order_by('-id')
    serializer_class = DAGSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        # Only show root DAGs (no parent) in list view
        if self.action == 'list':
            return Dag.objects.filter(parent=None).order_by('-id')
        return super().get_queryset()

    def create(self, request, *args, **kwargs):
        try:
            if isinstance(request.data, list):
                dags = []
                for dsl in request.data:
                    dags.append(Seaflow.load_dag(dsl))
                serializer = self.get_serializer(dags, many=True)
                return Response(serializer.data, status=201)
            else:
                dsl = request.data
                dag = Seaflow.load_dag(dsl)
                serializer = self.get_serializer(dag)
                return Response(serializer.data, status=201)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=True, methods=['post'])
    def trigger(self, request, pk=None):
        dag = self.get_object()
        # 这里需要集成 Seaflow 的执行逻辑
        # 假设有一个 run_dag 的方法
        # from seaflow.engine import run_dag
        # run_dag(dag)
        # Seaflow.create_task(dag_id=dag.id)
        task = Seaflow.create_task(dag_id=dag.id)
        return Response({'status': 'triggered', 'dag_id': dag.id, 'task_id': task.id})

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().order_by('-id')
    serializer_class = TaskSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        # Only show root Tasks (no parent) in list view
        if self.action == 'list':
            return Task.objects.filter(parent=None).order_by('-id')
        return super().get_queryset()
