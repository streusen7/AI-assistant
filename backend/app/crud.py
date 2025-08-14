# crud.py
from sqlalchemy.orm import Session
from . import models, schemas

# Create a new task
def create_task(db: Session, task: schemas.TaskCreate, user_id: int):
    db_task = models.Task(task_name=task.task_name, owner_id=user_id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

# Get all tasks for a user
def get_tasks(db: Session, user_id: int):
    return db.query(models.Task).filter(models.Task.owner_id == user_id).all()

# Get a single task by ID
def get_task(db: Session, task_id: int):
    return db.query(models.Task).filter(models.Task.id == task_id).first()

# Update a task
def update_task(db: Session, task_id: int, task: schemas.TaskUpdate):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()

    if db_task:
        if task.task_name is not None:
            db_task.task_name = task.task_name
        if task.completed is not None:
            db_task.completed = task.completed

        db.commit()
        db.refresh(db_task)
        return db_task
    return None

# Delete a task
def delete_task(db: Session, task_id: int):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task:
        db.delete(db_task)
        db.commit()
        return True
    return False
