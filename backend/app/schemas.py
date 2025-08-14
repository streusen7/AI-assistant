from pydantic import BaseModel

# Schema for creating a new task
class TaskCreate(BaseModel):
    task_name: str

# Optionally, schema for reading/displaying a task
class TaskRead(BaseModel):
    id: int
    task_name: str
    completed: bool

    class Config:
        orm_mode = True

# Schema for updating a task
class TaskUpdate(BaseModel):
    task_name: str | None = None
    completed: bool | None = None

    class Config:
        orm_mode = True
