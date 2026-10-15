from __future__ import annotations

import time
from typing import TYPE_CHECKING

from crystal_toolkit.apps.examples.cohp import app as cohp_app

if TYPE_CHECKING:
    from crystal_toolkit.apps.examples.tests.typing import DashDuo


def test_cohp_example_app_sections(dash_duo: DashDuo) -> None:
    dash_duo.start_server(cohp_app)
    dash_duo.clear_storage()

    time.sleep(5)
    dropdown = dash_duo.find_element(".react-select__control")
    dropdown.click()
    options = dash_duo.find_elements(".react-select__option")
    dash_duo.percy_snapshot("example_cohp_on_load_all")

    for option in options:
        if option.text.strip() == "cation-anion":
            option.click()
            time.sleep(5)
            dash_duo.percy_snapshot("example_cohp_on_load_cation_anion")
            break

    dash_duo.wait_for_element("[id$='cohp-dos-graph']", timeout=10)
    dash_duo.wait_for_element("[id$='summary_text']", timeout=10)
    dash_duo.wait_for_element("[id$='calc-quality-text']", timeout=10)
    dash_duo.wait_for_element("[id$='lobsterenv_text']", timeout=10)
    dash_duo.wait_for_element("[id$='perc_strength_icohp']", timeout=10)
    dash_duo.wait_for_element("[id$='lobsterenv-controls']", timeout=10)
    dash_duo.wait_for_element("[id$='lobsterenv_analysis']", timeout=10)

    logs = dash_duo.get_logs()
    assert not logs, f"Unexpected browser {logs=}"
