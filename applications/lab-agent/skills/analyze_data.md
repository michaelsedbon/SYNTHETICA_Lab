# Analyze Data — Analysis Workflow

When asked to analyze data, results, or observations from experiments.

## Steps

1. **Gather data**
   - `file_read("experiments/EXP_XXX/LOG.md")` — read the experiment log
   - `file_read("experiments/EXP_XXX/summary.md")` — read experiment context
   - Check for any data files: `run_command("ls experiments/EXP_XXX/data/ 2>/dev/null")`

2. **Summarize what was measured**
   - Extract key data points from logs
   - Note sample sizes, conditions, timeframes

3. **Look for patterns**
   - Compare across experimental conditions
   - Check for trends, outliers, unexpected values
   - Calculate basic statistics (mean, range) if applicable

4. **Search for relevant literature**
   - `search_papers("relevant topic")` — check the paper corpus
   - Compare your findings with published values

5. **Write analysis to LOG.md**
   ```
   ## Analysis — [Date]
   
   ### Data Summary
   [Key numbers and observations]
   
   ### Findings
   [Patterns, comparisons, insights]
   
   ### Implications
   [What this means for the project]
   ```

6. **Propose next steps**
   - Based on the analysis, what experiments should be run next?
   - Update AGENT_STATE.md with new questions and next steps
