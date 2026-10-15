from __future__ import annotations

import time
from pathlib import Path
from typing import TYPE_CHECKING

from monty.serialization import loadfn

from crystal_toolkit.apps.examples.localenv import app as localenv_app
from crystal_toolkit.components.lobsterenv import _get_lobsterenv_inputs

if TYPE_CHECKING:
    from crystal_toolkit.apps.examples.tests.typing import DashDuo


def test_localenv_example_renders_lobsterenv_controls(dash_duo: DashDuo) -> None:
    dash_duo.start_server(localenv_app)
    dash_duo.clear_storage()

    h4s = dash_duo.find_elements("h4.title.is-4")

    for h4 in h4s:
        if h4.text.strip() == "Local Environments":
            h4.click()
            dropdown = dash_duo.find_element(".react-select__control")
            dropdown.click()
            time.sleep(5)
            options = dash_duo.find_elements(".react-select__option")
            for option in options:
                if option.text.strip() == "LobsterEnv":
                    option.click()
                    time.sleep(5)
                    dash_duo.wait_for_element("[id$='perc_strength_icohp']", timeout=30)
                    dash_duo.wait_for_element("[id$='upload_data']", timeout=30)
                    dash_duo.wait_for_element("[id$='lobsterenv-controls']", timeout=30)
                    dash_duo.wait_for_element("[id$='lobsterenv_analysis']", timeout=30)
                    dash_duo.percy_snapshot("example_lobsterenv_on_load")
                    break

    _logs = dash_duo.get_logs()
    # TODO: get help with fixing this error
    # assert not logs, f"Unexpected browser {logs=}"


def test_lobsterenv_inputs_decode() -> None:
    working_dir = Path(__file__).resolve().parent.parent

    task_doc = loadfn(working_dir / "lobstertaskdoc.json")

    data = {
        "structure": task_doc.structure,
        "obj_icohp": task_doc.icohp_list,
        "obj_charge": task_doc.charges,
    }

    structure, obj_icohp, obj_charge = _get_lobsterenv_inputs(data)

    assert structure is not None
    assert obj_icohp is not None
    assert obj_charge is not None
