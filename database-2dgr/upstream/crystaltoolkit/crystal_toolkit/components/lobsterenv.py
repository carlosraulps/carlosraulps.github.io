from __future__ import annotations

from typing import TYPE_CHECKING

import dash_mp_components as mpc
from dash import dcc, html
from monty.json import MontyDecoder
from pymatgen.analysis.chemenv.coordination_environments.coordination_geometries import (
    AllCoordinationGeometries,
    CoordinationGeometry,
)
from pymatgen.analysis.graphs import MoleculeGraph
from pymatgen.analysis.lobster_env import LobsterNeighbors
from pymatgen.core import Molecule
from pymatgen.symmetry.analyzer import SpacegroupAnalyzer
from pymatgen.util.string import unicodeify_species

from crystal_toolkit.components.structure import StructureMoleculeComponent
from crystal_toolkit.helpers.layouts import H5, Column, Columns, get_table, get_tooltip

if TYPE_CHECKING:
    from pymatgen.io.lobster import Charge, Icohplist


def _get_lobsterenv_inputs(data: dict):
    """Extract and deserialize lobsterenv inputs from data dict.

    Args:
        data: Dictionary containing obj_charge, obj_icohp, and structure

    Returns:
        Tuple of (structure, obj_icohp, obj_charge)

    Raises:
        ValueError: If charge and ICOHP data are not available.
    """
    data = data or {}

    obj_charge = data.get("obj_charge")
    obj_icohp = data.get("obj_icohp")
    struct = data.get("structure")

    if not obj_charge or not obj_icohp:
        raise ValueError(
            "LobsterEnv analysis requires LOBSTER outputs (ICOHP + charge data). "
            "Please provide `obj_icohp` and `obj_charge` in the component data."
        )

    if obj_charge and isinstance(obj_charge, dict):
        obj_charge = MontyDecoder().process_decoded(obj_charge)

    if obj_icohp and isinstance(obj_icohp, dict):
        obj_icohp = MontyDecoder().process_decoded(obj_icohp)

    if struct and isinstance(struct, dict):
        struct = MontyDecoder().process_decoded(struct)

    return struct, obj_icohp, obj_charge


def _get_lobsterenv_controls(
    component, state=None, slider_label="Bond strength cutoff %"
):
    """Build the shared LobsterEnv control panel for Dash components.

    Args:
        component: Component instance exposing the standard Dash input helpers.
        state: Optional state dict to seed the input values.
        slider_label: Label shown above the ICOHP cutoff slider.

    Returns:
        A Columns layout containing the common LobsterEnv controls.
    """
    lobsterenv_state = state or {
        "lobsterenv-analysis-mode": "all",
        "perc_strength_icohp": 0.15,
        "which_charge": "Mulliken",
        "adapt_extremum": True,
        "noise_cutoff": 1e-3,
    }

    lobsterenv_analysis_options = [
        {"label": "all", "value": "all"},
        {"label": "cation-anion", "value": "cation-anion"},
    ]

    lobsterenv_analysis_mode = component.get_choice_input(
        kwarg_label="lobsterenv-analysis-mode",
        state=lobsterenv_state,
        label="Analysis mode",
        help_str="Choose whether to analyze all bonds or only cation-anion bonds",
        options=lobsterenv_analysis_options,
    )

    charge_type_options = [
        {"label": "Mulliken", "value": "Mulliken"},
        {"label": "Loewdin", "value": "Loewdin"},
    ]

    charge_type = component.get_choice_input(
        kwarg_label="which_charge",
        state=lobsterenv_state,
        label="Charge type",
        help_str="Select the atomic charge type to use for the cation-anion classification",
        options=charge_type_options,
    )

    icohp_cutoff = html.Div(
        [
            H5(slider_label),
            dcc.Slider(
                id=component.id("perc_strength_icohp"),
                min=0,
                max=1,
                step=0.01,
                value=0.15,
                marks={i: f"{i:.0%}" for i in [0, 0.25, 0.5, 0.75, 1]},
                tooltip={"placement": "bottom", "always_visible": True},
            ),
        ],
        style={"width": "100%"},
    )

    adapt_extremum = component.get_bool_input(
        label="Adapt extremum to additional condition",
        kwarg_label="adapt_extremum",
        state=lobsterenv_state,
        help_str="If enabled, adapts the ICOHP extremum based on additional conditions (cation-anion mode)",
    )

    noise_cutoff = component.get_numerical_input(
        label="Noise cutoff",
        kwarg_label="noise_cutoff",
        state=lobsterenv_state,
        help_str="Noise cutoff threshold for filtering small bond strength values",
        shape=(),
        min=0.0,
    )

    return Columns(
        [
            Column([lobsterenv_analysis_mode, charge_type], size=3),
            Column([icohp_cutoff], size=3),
            Column([adapt_extremum, noise_cutoff], size=3),
        ],
        id=component.id("lobsterenv-controls"),
    )


def _perform_lobsterenv_analysis(
    struct,
    obj_icohp: Icohplist,
    obj_charge: Charge,
    perc_strength_icohp: float,
    which_charge: str,
    only_cation_anion: bool,
    adapt_extremum: bool,
    noise_cutoff=1e-3,
):
    """Perform LobsterEnv local environment analysis.

    Args:
        struct: Structure object
        obj_icohp: pymatgen ICOHP/ICOBI/ICOOPLIST object
        obj_charge: pymatgen Charge object
        perc_strength_icohp: ICOHP cutoff percentage
        which_charge: Charge type ("Mulliken" or "Loewdin")
        only_cation_anion: Whether to only show cation-anion bonds
        adapt_extremum: Whether to adapt extremum to additional conditions
        noise_cutoff: Noise cutoff threshold for LOBSTER output (default: 1e-3)

    Returns:
        html.Div with the analysis results

    Raises:
        ValueError: If analysis fails
    """
    sga = SpacegroupAnalyzer(struct)
    symm_struct = sga.get_symmetrized_structure()
    inequivalent_indices = [indices[0] for indices in symm_struct.equivalent_indices]
    wyckoffs = symm_struct.wyckoff_symbols

    edge_weight_name = "ICOHP"
    edge_weight_units = ""
    if obj_icohp.are_coops:
        edge_weight_name = "ICOOP"
    elif obj_icohp.are_cobis:
        edge_weight_name = "ICOBI"
    else:
        edge_weight_units = "eV"

    edge_weight_name_mapping = {edge_weight_name: edge_weight_name}

    try:
        lobster_neighbors = LobsterNeighbors(
            icoxxlist_obj=obj_icohp,
            structure=struct,
            charge_obj=obj_charge,
            which_charge=which_charge,
            valences_from_charges=True,
            perc_strength_icohp=perc_strength_icohp,
            additional_condition=1 if only_cation_anion else 0,
            adapt_extremum_to_add_cond=adapt_extremum,
            are_coops=obj_icohp.are_coops,
            are_cobis=obj_icohp.are_cobis,
            noise_cutoff=noise_cutoff,
        )
    except ValueError as err:
        if (
            str(err) == "min() arg is an empty sequence"
            or str(err)
            == "All valences are equal to 0, additional_conditions 1, 3, 5 and 6 will not work"
        ) and only_cation_anion:
            raise ValueError(
                "No cations detected. Consider analyzing all bonds instead of only cation-anion bonds, "
                "or try adjusting the ICOHP cutoff percentage."
            ) from err
        raise ValueError(
            "LobsterEnv failed to initialize. Try adjusting the ICOHP cutoff percentage and retry."
        ) from err

    lse = lobster_neighbors.get_light_structure_environment(
        only_cation_environments=only_cation_anion, on_error="warn"
    )

    all_ce = AllCoordinationGeometries()
    envs = []

    for index, wyckoff in zip(inequivalent_indices, wyckoffs):
        env = lse.coordination_environments[index]
        if env[0]["ce_symbol"]:
            warning_message = None
            try:
                co = all_ce.get_geometry_from_mp_symbol(env[0]["ce_symbol"])
            except LookupError:
                warning_message = html.Div(
                    [
                        mpc.Markdown(
                            "Non standard coordination geometry found. Increase the ICOHP cutoff percentage to see if a valid environment is detected."
                        )
                    ],
                    style={"margin-top": "0.5rem"},
                )
                co = CoordinationGeometry(
                    coordination=float(env[0]["ce_symbol"]),
                    mp_symbol=env[0]["ce_symbol"],
                    IUPAC_symbol="",
                    alternative_names=[],
                    name=f"{env[0]['ce_symbol']}-fold",
                )

            csm = round(env[0]["csm"], 2) if isinstance(env[0]["csm"], float) else "NaN"

            datalist = [
                ["Site", unicodeify_species(struct[index].species_string)],
                ["Wyckoff Label", wyckoff],
            ]

            local_env_data = lobster_neighbors.get_nn_info(struct, index)

            charge_data = getattr(obj_charge, which_charge.lower(), obj_charge.mulliken)
            charges = [charge_data[index]]
            charges.extend([charge_data[i["site_index"]] for i in local_env_data])
            neighbour_weights = [i["edge_properties"]["ICOHP"] for i in local_env_data]

            mol = Molecule.from_sites(
                [struct[index], *lse.neighbors_sets[index][0].neighb_sites]
            )
            mol = mol.get_centered_molecule()

            mol = mol.add_site_property("charge", charges)

            mg = MoleculeGraph.from_empty_graph(
                molecule=mol,
                name="bond_strength",
                edge_weight_name=edge_weight_name,
                edge_weight_units=edge_weight_units,
            )
            for i in range(1, len(mol)):
                mg.add_edge(0, i, weight=neighbour_weights[i - 1])

            view = html.Div(
                [
                    StructureMoleculeComponent(
                        struct_or_mol=mg,
                        disable_callbacks=True,
                        id=f"{struct.composition.reduced_formula}_site_{index}",
                        scene_settings={
                            "enableZoom": False,
                            "defaultZoom": 0.6,
                        },
                        site_get_scene_kwargs={
                            "edge_weight_name_mapping": edge_weight_name_mapping
                        },
                    )._sub_layouts["struct"]
                ],
                style={"width": "300px", "height": "300px"},
            )

            name = co.name
            if co.alternative_names:
                name += f" (also known as {', '.join(co.alternative_names)})"

            datalist.extend(
                [
                    ["Environment", name],
                    ["IUPAC Symbol", co.IUPAC_symbol_str],
                    [
                        get_tooltip(
                            "CSM",
                            "The continuous symmetry measure (CSM) describes the similarity to an "
                            "ideal coordination environment. It can be understood as a 'distance' to "
                            "a shape and ranges from 0 to 100 in which 0 corresponds to a "
                            "coordination environment that is exactly identical to the ideal one. A "
                            "CSM larger than 5.0 already indicates a relatively strong distortion of "
                            "the investigated coordination environment.",
                        ),
                        f"{csm}",
                    ],
                    ["Interactive View", view],
                ]
            )

            env_content = [get_table(rows=datalist)]
            if warning_message is not None:
                env_content.append(warning_message)
            envs.append(html.Div(env_content, style={"margin-bottom": "1rem"}))

    envs_grouped = [envs[i : i + 2] for i in range(0, len(envs), 2)]
    analysis_contents = [
        Columns([Column(e, size=6) for e in env_group]) for env_group in envs_grouped
    ]

    return html.Div([html.Div(analysis_contents)])
