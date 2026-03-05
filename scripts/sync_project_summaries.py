#!/usr/bin/env python3
"""
Sync project summaries from the Notion Lab Notebook.

For each project folder in projects/, queries Notion for experiments
tagged with that project name and updates the AUTO:EXPERIMENTS block
in summary.md with a fresh experiment table.

Usage:
    python3 sync_project_summaries.py           # Sync all projects
    python3 sync_project_summaries.py --dry-run  # Preview without writing
"""

import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, SCRIPT_DIR)

from notion_client import (
    CONFIG, query_database, get_title_from_page, get_property_value
)

LAB_DB = CONFIG['notion']['lab_notebook_db']
PROJECTS_DIR = os.path.join(PROJECT_DIR, 'projects')

# Map folder names → Notion 'Project link' tag names
PROJECT_TAGS = {
    'cryptographic_beings': 'Cryptographic Beings',
    'bio_electronic_music': 'Bio Electronic Music',
}

AUTO_START = '<!-- AUTO:EXPERIMENTS -->'
AUTO_END = '<!-- /AUTO:EXPERIMENTS -->'


def get_experiments_for_project(project_tag):
    """Query Notion for experiments tagged with a project."""
    pages = query_database(LAB_DB, filter_obj={
        "property": "Project link",
        "multi_select": {"contains": project_tag}
    })
    experiments = []
    for page in pages:
        exp_number = get_property_value(page, 'Exp Number') or ''
        title = get_title_from_page(page)
        start_date = get_property_value(page, 'Start Date') or ''
        experiments.append({
            'exp': exp_number,
            'title': title,
            'date': start_date,
        })
    # Sort by experiment number
    experiments.sort(key=lambda e: e['exp'])
    return experiments


def build_experiment_table(experiments):
    """Build a markdown table from experiment list."""
    if not experiments:
        return "*No experiments tagged yet.*"

    lines = [
        "| Exp | Title | Start Date |",
        "|-----|-------|------------|",
    ]
    for e in experiments:
        exp_link = f"[{e['exp']}](../../experiments/{e['exp']}/summary.md)"
        lines.append(f"| {exp_link} | {e['title']} | {e['date']} |")
    return '\n'.join(lines)


def update_summary(summary_path, experiment_table, dry_run=False):
    """Replace the AUTO:EXPERIMENTS block in a summary.md file."""
    if not os.path.exists(summary_path):
        return False

    with open(summary_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find and replace the auto block
    pattern = re.compile(
        re.escape(AUTO_START) + r'.*?' + re.escape(AUTO_END),
        re.DOTALL
    )
    replacement = f"{AUTO_START}\n{experiment_table}\n{AUTO_END}"

    if not pattern.search(content):
        print(f"  ⚠ No {AUTO_START} block found in {summary_path}")
        return False

    new_content = pattern.sub(replacement, content)

    if new_content == content:
        return True  # No changes needed

    if dry_run:
        print(f"  🔍 Would update: {summary_path}")
        print(f"     Experiments: {experiment_table.count('|') // 4}")
        return True

    with open(summary_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    return True


def sync_all(dry_run=False):
    """Sync all project summaries."""
    print("Syncing project summaries from Notion...\n")

    if not os.path.isdir(PROJECTS_DIR):
        print(f"  ✗ Projects directory not found: {PROJECTS_DIR}")
        return

    for folder_name, project_tag in PROJECT_TAGS.items():
        project_dir = os.path.join(PROJECTS_DIR, folder_name)
        summary_path = os.path.join(project_dir, 'summary.md')

        if not os.path.isdir(project_dir):
            print(f"  ⚠ Skipping {folder_name} — directory not found")
            continue

        print(f"📁 {project_tag} ({folder_name}/)")

        # Query Notion
        experiments = get_experiments_for_project(project_tag)
        print(f"   Found {len(experiments)} experiments")

        # Build table
        table = build_experiment_table(experiments)

        # Update summary.md
        if update_summary(summary_path, table, dry_run=dry_run):
            if not dry_run:
                print(f"   ✅ Updated {summary_path}")
        else:
            print(f"   ⚠ Could not update summary")

        print()

    print("Done!")


if __name__ == '__main__':
    dry = '--dry-run' in sys.argv
    sync_all(dry_run=dry)
