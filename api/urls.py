from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DAGViewSet, TaskViewSet, ActionViewSet

router = DefaultRouter()
router.register(r'dags', DAGViewSet)
router.register(r'tasks', TaskViewSet)
router.register(r'actions', ActionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
