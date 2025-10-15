from locust import HttpUser, between, task


class APIUser(HttpUser):
    wait_time = between(1, 3)
    host = "http://localhost:8000"

    @task(3)
    def get_root(self):
        self.client.get("/")

    @task(2)
    def get_health(self):
        self.client.get("/health")

    @task(1)
    def get_info(self):
        self.client.get("/info")
