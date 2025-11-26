from django.db import connection

def run():
    with connection.cursor() as cursor:
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        cursor.execute("DROP TABLE IF EXISTS seaflow_task;")
        cursor.execute("DROP TABLE IF EXISTS seaflow_step;")
        cursor.execute("DROP TABLE IF EXISTS seaflow_node;")
        cursor.execute("DROP TABLE IF EXISTS seaflow_dag;")
        cursor.execute("DROP TABLE IF EXISTS seaflow_action;")
        cursor.execute("DROP TABLE IF EXISTS seaflow_log;")
        cursor.execute("DROP TABLE IF EXISTS seaflow_step_to_step;")
        cursor.execute("DROP TABLE IF EXISTS seaflow_task_to_step;")
        cursor.execute("DROP TABLE IF EXISTS seaflow_step_to_task;")
        cursor.execute("DROP TABLE IF EXISTS seaflow_task_to_task;")
        cursor.execute("DROP TABLE IF EXISTS seaflow_dag_to_node;")
        cursor.execute("DROP TABLE IF EXISTS seaflow_node_to_node;")
        cursor.execute("DROP TABLE IF EXISTS seaflow_node_to_dag;")
        cursor.execute("DROP TABLE IF EXISTS seaflow_dag_to_dag;")
        cursor.execute("DELETE FROM django_migrations WHERE app='seaflow';")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
    print("Tables dropped and migration history cleared.")
