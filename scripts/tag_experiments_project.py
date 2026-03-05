#!/usr/bin/env python3
"""
Tag experiments in the Notion Lab Notebook with their parent project.

Uses the existing 'Project link' multi_select property.

Usage:
    python3 tag_experiments_project.py EXP_002 "Cryptographic Beings"
    python3 tag_experiments_project.py --batch   # Applies the built-in mapping
    python3 tag_experiments_project.py --list     # List current project tags
"""

import os
import sys
import json
import requests

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, SCRIPT_DIR)

from notion_client import (
    CONFIG, HEADERS, query_database, get_title_from_page,
    get_property_value
)

LAB_DB = CONFIG['notion']['lab_notebook_db']

# ── Built-in project → experiment mapping ──────────────────────────

PROJECT_MAP = {
    "Cryptographic Beings": ["EXP_002", "EXP_003", "EXP_004"],
    # "Bio Electronic Music": [],  # Add experiments when they exist
}


def find_page_by_exp(exp_id):
    """Find a Notion page by its 'Exp Number' select property."""
    pages = query_database(LAB_DB, filter_obj={
        "property": "Exp Number",
        "select": {"equals": exp_id}
    })
    return pages[0] if pages else None


def update_page_properties(page_id, properties):
    """Update properties on a Notion page."""
    url = f"https://api.notion.com/v1/pages/{page_id}"
    resp = requests.patch(url, headers=HEADERS, json={"properties": properties})
    if not resp.ok:
        print(f"  ✗ Failed to update: {resp.status_code}")
        print(f"    {resp.text}")
        resp.raise_for_status()
    return resp.json()


def tag_experiment(exp_id, project_name, dry_run=False):
    """Set the 'Project link' multi_select on an experiment page."""
    page = find_page_by_exp(exp_id)
    if not page:
        print(f"  ⚠ Experiment {exp_id} not found in Notion")
        return False

    title = get_title_from_page(page)
    current_projects = get_property_value(page, 'Project link') or []

    if project_name in current_projects:
        print(f"  ✓ {exp_id} already tagged with '{project_name}'")
        return True

    # Build the new multi_select value (keep existing + add new)
    new_tags = [{"name": p} for p in current_projects if p != project_name]
    new_tags.append({"name": project_name})

    if dry_run:
        print(f"  🔍 Would tag {exp_id} ({title}) → '{project_name}'")
        return True

    update_page_properties(page['id'], {
        "Project link": {"multi_select": new_tags}
    })
    print(f"  ✅ Tagged {exp_id} ({title}) → '{project_name}'")
    return True


def batch_tag(dry_run=False):
    """Apply the built-in PROJECT_MAP to all experiments."""
    print("Batch tagging experiments with projects...\n")
    for project_name, exp_ids in PROJECT_MAP.items():
        print(f"📁 {project_name}:")
        for exp_id in exp_ids:
            tag_experiment(exp_id, project_name, dry_run=dry_run)
        print()
    print("Done!")


def list_tags():
    """List all experiments and their current project tags."""
    pages = query_database(LAB_DB)
    print(f"\n🔬 Experiment → Project Tags\n")
    for page in pages:
        exp = get_property_value(page, 'Exp Number') or 'N/A'
        title = get_title_from_page(page)
        projects = get_property_value(page, 'Project link') or []
        tag_str = ', '.join(projects) if projects else '(none)'
        print(f"  {exp}: {title}")
        print(f"         → {tag_str}")
    print()


if __name__ == '__main__':
    if '--list' in sys.argv:
        list_tags()
    elif '--batch' in sys.argv:
        dry = '--dry-run' in sys.argv
        batch_tag(dry_run=dry)
    elif len(sys.argv) >= 3:
        exp = sys.argv[1]
        project = sys.argv[2]
        dry = '--dry-run' in sys.argv
        tag_experiment(exp, project, dry_run=dry)
    else:
        print("Usage:")
        print('  python3 tag_experiments_project.py EXP_002 "Cryptographic Beings"')
        print("  python3 tag_experiments_project.py --batch [--dry-run]")
        print("  python3 tag_experiments_project.py --list")
