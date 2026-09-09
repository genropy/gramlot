# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Build a native worker-pool configuration for the page laboratory."""
from pathlib import Path

from genro_asgi.applications.spa_app import SpaApplication
from genro_asgi.config import AsgiConfigBuilder


class PageConfiguration(AsgiConfigBuilder):
    default_config = False

    def __init__(self, client_modules, state_dir, rpc_http_method="WSK"):
        self.rpc_http_method = rpc_http_method
        self.client_modules = str(Path(client_modules).resolve())
        self.state_dir = Path(state_dir).resolve()
        super().__init__()

    def main(self, root):
        app = root.configuration().applications().application(
            code="pages", mount="", app_class=SpaApplication)
        commander = app.orchestration().commander(
            frozen_users_path=str(self.state_dir / "frozen"),
            instance_dir=str(self.state_dir / "instance"),
            orchestration_log_path=str(self.state_dir / "pool.log"))
        commander.groups(default="pages").group(
            name="pages", entry_module="genro_asgi.spa.orchestration.worker_entry",
            worker_class="gramlot.worker:PageWorker",
            worker_kwargs={"client_modules": self.client_modules, "rpc_http_method": self.rpc_http_method},
            main_threadpool_size=4, aux_threadpool_size=1)
