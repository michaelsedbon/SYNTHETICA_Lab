"""
Skill Manager API — FastAPI backend for managing agent skills across workspaces.

Scans ~/antigravity-skills/ for available skills and discovers workspaces
by finding .agent directories. State is derived from filesystem (symlinks).
"""

import os
import re
import subprocess
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI(title="Skill Manager")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

HOME = Path.home()
SKILLS_HOME = HOME / "antigravity-skills" / "skills"
INSTALL_SCRIPT = HOME / "antigravity-skills" / "install.sh"

# Known workspace search roots
WORKSPACE_SEARCH_ROOTS = [
    HOME / "Documents",
    HOME / "Desktop",
    HOME / "Downloads",
    HOME / "Projects",
    HOME / "dev",
    HOME / "repos",
]

# ─── Subcategory inference for third-party skills ───

SKILL_SUBCATEGORIES = {
    # Bioinformatics
    "biopython": "Bioinformatics", "scanpy": "Bioinformatics", "anndata": "Bioinformatics",
    "scvelo": "Bioinformatics", "scvi-tools": "Bioinformatics", "gget": "Bioinformatics",
    "pysam": "Bioinformatics", "scikit-bio": "Bioinformatics", "bioservices": "Bioinformatics",
    "deeptools": "Bioinformatics", "cellxgene-census": "Bioinformatics", "arboreto": "Bioinformatics",
    "flowio": "Bioinformatics", "geniml": "Bioinformatics", "gtars": "Bioinformatics",
    "pydeseq2": "Bioinformatics", "scvi-tools": "Bioinformatics", "lamindb": "Bioinformatics",
    "tiledbvcf": "Bioinformatics",
    # Cheminformatics
    "rdkit": "Cheminformatics", "datamol": "Cheminformatics", "molfeat": "Cheminformatics",
    "deepchem": "Cheminformatics", "torchdrug": "Cheminformatics", "diffdock": "Cheminformatics",
    "medchem": "Cheminformatics", "rowan": "Cheminformatics", "molecular-dynamics": "Cheminformatics",
    "matchms": "Cheminformatics", "pyopenms": "Cheminformatics",
    # Proteomics & Structural
    "esm": "Proteomics", "adaptyv": "Proteomics", "glycoengineering": "Proteomics",
    "alphafold-database": "Proteomics", "pdb-database": "Proteomics",
    # Clinical & Medical
    "clinicaltrials-database": "Clinical", "clinvar-database": "Clinical",
    "clinpgx-database": "Clinical", "cosmic-database": "Clinical",
    "cbioportal-database": "Clinical", "depmap": "Clinical",
    "clinical-decision-support": "Clinical", "clinical-reports": "Clinical",
    "treatment-plans": "Clinical", "fda-database": "Clinical",
    "pyhealth": "Clinical", "neurokit2": "Clinical",
    # ML & AI
    "pytorch-lightning": "ML & AI", "scikit-learn": "ML & AI",
    "transformers": "ML & AI", "stable-baselines3": "ML & AI",
    "pufferlib": "ML & AI", "shap": "ML & AI", "pymc": "ML & AI",
    "pymoo": "ML & AI", "torch-geometric": "ML & AI", "umap-learn": "ML & AI",
    "statsmodels": "ML & AI", "scikit-survival": "ML & AI",
    "timesfm-forecasting": "ML & AI",
    # Databases
    "pubmed-database": "Databases", "openalex-database": "Databases",
    "biorxiv-database": "Databases", "uniprot-database": "Databases",
    "pubchem-database": "Databases", "chembl-database": "Databases",
    "drugbank-database": "Databases", "ensembl-database": "Databases",
    "gene-database": "Databases", "geo-database": "Databases",
    "kegg-database": "Databases", "reactome-database": "Databases",
    "string-database": "Databases", "gnomad-database": "Databases",
    "gtex-database": "Databases", "gwas-database": "Databases",
    "interpro-database": "Databases", "jaspar-database": "Databases",
    "hmdb-database": "Databases", "zinc-database": "Databases",
    "brenda-database": "Databases", "ena-database": "Databases",
    "opentargets-database": "Databases", "monarch-database": "Databases",
    "bindingdb-database": "Databases", "metabolomics-workbench-database": "Databases",
    "uspto-database": "Databases", "imaging-data-commons": "Databases",
    # Visualization
    "matplotlib": "Visualization", "seaborn": "Visualization", "plotly": "Visualization",
    "scientific-visualization": "Visualization", "infographics": "Visualization",
    "scientific-schematics": "Visualization",
    # Data & Compute
    "dask": "Data & Compute", "polars": "Data & Compute", "vaex": "Data & Compute",
    "zarr-python": "Data & Compute", "networkx": "Data & Compute",
    "sympy": "Data & Compute", "geopandas": "Data & Compute",
    "geomaster": "Data & Compute", "datacommons-client": "Data & Compute",
    "modal": "Data & Compute", "simpy": "Data & Compute", "matlab": "Data & Compute",
    # Materials & Physics
    "pymatgen": "Materials & Physics", "cobrapy": "Materials & Physics",
    "astropy": "Materials & Physics", "cirq": "Materials & Physics",
    "pennylane": "Materials & Physics", "qiskit": "Materials & Physics",
    "qutip": "Materials & Physics", "fluidsim": "Materials & Physics",
    # Lab Automation
    "pylabrobot": "Lab Automation", "opentrons-integration": "Lab Automation",
    "benchling-integration": "Lab Automation", "protocolsio-integration": "Lab Automation",
    "ginkgo-cloud-lab": "Lab Automation", "latchbio-integration": "Lab Automation",
    "dnanexus-integration": "Lab Automation", "omero-integration": "Lab Automation",
    "labarchive-integration": "Lab Automation",
    # Scientific Communication
    "literature-review": "Communication", "scientific-writing": "Communication",
    "peer-review": "Communication", "citation-management": "Communication",
    "pyzotero": "Communication", "scientific-slides": "Communication",
    "latex-posters": "Communication", "pptx-posters": "Communication",
    "paper-2-web": "Communication", "venue-templates": "Communication",
    "markdown-mermaid-writing": "Communication",
    # Research Methods
    "hypothesis-generation": "Research Methods", "scientific-brainstorming": "Research Methods",
    "scientific-critical-thinking": "Research Methods", "scholar-evaluation": "Research Methods",
    "research-grants": "Research Methods", "research-lookup": "Research Methods",
    "what-if-oracle": "Research Methods", "consciousness-council": "Research Methods",
    "dhdna-profiler": "Research Methods", "hypogenic": "Research Methods",
    "hypothesis-generation": "Research Methods", "open-notebook": "Research Methods",
    "exploratory-data-analysis": "Research Methods", "statistical-analysis": "Research Methods",
    # Search & Web
    "perplexity-search": "Search & Web", "parallel-web": "Search & Web",
    "bgpt-paper-search": "Search & Web", "markitdown": "Search & Web",
    # Finance
    "edgartools": "Finance", "fred-economic-data": "Finance",
    "usfiscaldata": "Finance", "hedgefundmonitor": "Finance",
    "alpha-vantage": "Finance",
    # Medical Imaging
    "pydicom": "Medical Imaging", "histolab": "Medical Imaging",
    "pathml": "Medical Imaging", "neuropixels-analysis": "Medical Imaging",
    # Documents
    "docx": "Documents", "pdf": "Documents", "pptx": "Documents",
    "xlsx": "Documents", "generate-image": "Documents",
}


def _parse_skill_md(skill_dir: Path) -> dict:
    """Parse SKILL.md frontmatter for name and description."""
    skill_md = skill_dir / "SKILL.md"
    name = skill_dir.name
    description = ""
    if skill_md.exists():
        text = skill_md.read_text(errors="ignore")
        fm = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
        if fm:
            for line in fm.group(1).split("\n"):
                if line.strip().startswith("description:"):
                    description = line.split(":", 1)[1].strip().strip("'\"")
                    break
    subcategory = SKILL_SUBCATEGORIES.get(name, "")
    return {"name": name, "description": description, "subcategory": subcategory, "path": str(skill_dir)}


def _discover_skills() -> dict:
    """Scan ~/antigravity-skills/ for all available skills."""
    sections = {}

    # Built-in
    built_in_dir = SKILLS_HOME / "built-in"
    if built_in_dir.exists():
        skills = []
        for d in sorted(built_in_dir.iterdir()):
            if d.is_dir() and (d / "SKILL.md").exists():
                info = _parse_skill_md(d)
                info["section"] = "built-in"
                skills.append(info)
        sections["built-in"] = skills

    # Custom
    custom_dir = SKILLS_HOME / "custom"
    if custom_dir.exists():
        skills = []
        for d in sorted(custom_dir.iterdir()):
            if d.is_dir() and (d / "SKILL.md").exists():
                info = _parse_skill_md(d)
                info["section"] = "custom"
                skills.append(info)
        sections["custom"] = skills

    # Third-party (nested repos)
    third_party_dir = SKILLS_HOME / "third-party"
    if third_party_dir.exists():
        for repo in sorted(third_party_dir.iterdir()):
            if not repo.is_dir():
                continue
            repo_name = repo.name
            skills = []
            for subdir_name in ["scientific-skills", "skills", ""]:
                skill_root = repo / subdir_name if subdir_name else repo
                if skill_root.exists() and skill_root.is_dir():
                    for d in sorted(skill_root.iterdir()):
                        if d.is_dir() and (d / "SKILL.md").exists():
                            info = _parse_skill_md(d)
                            info["section"] = f"third-party:{repo_name}"
                            skills.append(info)
                    if skills:
                        break
            if skills:
                sections[f"third-party:{repo_name}"] = skills

    return sections


def _discover_workspaces() -> list:
    """Find all directories containing .agent/."""
    workspaces = []
    seen = set()

    for root in WORKSPACE_SEARCH_ROOTS:
        if not root.exists():
            continue
        for dirpath, dirnames, _ in os.walk(str(root)):
            skip = {"node_modules", ".git", "__pycache__", ".venv", "venv", ".next", "dist"}
            dirnames[:] = [d for d in dirnames if d not in skip]

            agent_dir = Path(dirpath) / ".agent"
            if agent_dir.is_dir() and dirpath not in seen:
                seen.add(dirpath)
                ws_path = Path(dirpath)
                name = ws_path.name
                manifest = agent_dir / "MANIFEST.md"
                if manifest.exists():
                    text = manifest.read_text(errors="ignore")
                    m = re.search(r"^#\s+(.+)", text, re.MULTILINE)
                    if m:
                        title = m.group(1).strip()
                        title = re.sub(r"^AI Assistant Manifest\s*[—–-]\s*", "", title)
                        if title:
                            name = title

                skills_dir = agent_dir / "skills"
                skill_count = 0
                if skills_dir.exists():
                    skill_count = sum(1 for d in skills_dir.iterdir()
                                     if d.is_dir() or d.is_symlink())

                workspaces.append({
                    "id": str(ws_path),
                    "name": name,
                    "path": str(ws_path),
                    "short_path": str(ws_path).replace(str(HOME), "~"),
                    "skill_count": skill_count,
                })

    return sorted(workspaces, key=lambda w: w["name"])


def _get_installed_skills(workspace_path: str) -> list:
    """List skills installed in a workspace."""
    skills_dir = Path(workspace_path) / ".agent" / "skills"
    if not skills_dir.exists():
        return []

    installed = []
    for entry in sorted(skills_dir.iterdir()):
        if not (entry.is_dir() or entry.is_symlink()):
            continue
        info = {"name": entry.name, "is_symlink": entry.is_symlink()}

        # Resolve the actual path
        if entry.is_symlink():
            target = os.readlink(str(entry))
            info["target"] = target
            real_path = str(entry.resolve()) if entry.exists() else target
            info["real_path"] = real_path
            if "/built-in/" in target:
                info["source"] = "built-in"
            elif "/custom/" in target:
                info["source"] = "custom"
            elif "/third-party/" in target:
                info["source"] = "third-party"
            else:
                info["source"] = "external"
        else:
            info["source"] = "local"
            info["real_path"] = str(entry)

        # Parse SKILL.md for description
        actual_dir = entry.resolve() if entry.exists() else entry
        skill_md = actual_dir / "SKILL.md"
        if skill_md.exists():
            text = skill_md.read_text(errors="ignore")
            fm = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
            if fm:
                for line in fm.group(1).split("\n"):
                    if line.strip().startswith("description:"):
                        info["description"] = line.split(":", 1)[1].strip().strip("'\"")
                        break
        if "description" not in info:
            info["description"] = ""

        installed.append(info)
    return installed


# --- API Routes ---

@app.get("/api/workspaces")
def list_workspaces():
    return _discover_workspaces()


@app.get("/api/skills")
def list_all_skills():
    return _discover_skills()


@app.get("/api/workspace/skills")
def get_workspace_skills(path: str):
    if not Path(path).exists():
        raise HTTPException(404, f"Workspace not found: {path}")
    return _get_installed_skills(path)


@app.get("/api/skill/preview")
def preview_skill(path: str):
    """Return raw SKILL.md content for preview."""
    skill_dir = Path(path)
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        raise HTTPException(404, f"SKILL.md not found in {path}")
    return {"content": skill_md.read_text(errors="ignore"), "path": str(skill_md)}


class SkillAction(BaseModel):
    workspace_path: str
    skill_name: str


@app.post("/api/install")
def install_skill(action: SkillAction):
    ws = Path(action.workspace_path)
    skills_dir = ws / ".agent" / "skills"
    if not ws.exists():
        raise HTTPException(404, f"Workspace not found: {ws}")
    skills_dir.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [str(INSTALL_SCRIPT), action.skill_name, str(skills_dir)],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        raise HTTPException(400, result.stderr or result.stdout)
    return {"status": "ok", "message": result.stdout.strip()}


@app.post("/api/uninstall")
def uninstall_skill(action: SkillAction):
    ws = Path(action.workspace_path)
    skills_dir = ws / ".agent" / "skills"
    link = skills_dir / action.skill_name
    if not link.exists() and not link.is_symlink():
        raise HTTPException(404, f"Skill not installed: {action.skill_name}")
    if link.is_symlink():
        link.unlink()
        return {"status": "ok", "message": f"Uninstalled {action.skill_name}"}
    else:
        raise HTTPException(
            400,
            f"{action.skill_name} is a local directory, not a symlink. Remove manually.",
        )


class FinderAction(BaseModel):
    path: str


@app.post("/api/open-finder")
def open_in_finder(action: FinderAction):
    """Open a path in macOS Finder."""
    p = Path(action.path)
    if not p.exists():
        raise HTTPException(404, f"Path not found: {action.path}")
    subprocess.Popen(["open", "-R", str(p)])
    return {"status": "ok"}


# --- Static file serving ---

FRONTEND_DIR = Path(__file__).parent.parent

@app.get("/")
def serve_index():
    return FileResponse(FRONTEND_DIR / "index.html")

app.mount("/", StaticFiles(directory=str(FRONTEND_DIR)), name="static")
