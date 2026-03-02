# Literature Review — Paper Search Workflow

When asked to find relevant papers, review literature, or understand a topic.

## Steps

1. **Search the local corpus**
   - `search_papers("your query")` — searches `papers_txt/INDEX.md`
   - Read matching paper summaries

2. **Read full paper text if available**
   - `file_read("papers_txt/PAPER_NAME.txt")` — extracted text from PDFs
   - Focus on: Abstract, Methods, Results, key figures

3. **Synthesize findings**
   - Identify the 3-5 most relevant papers
   - Note key findings, methods, parameters
   - Compare with our experimental setup

4. **Write literature summary**
   - Add a section to the experiment LOG.md or create a dedicated doc:
   ```
   ## Literature Review — [Topic]
   
   ### Key Papers
   1. [Author et al.] — [Key finding relevant to us]
   2. [Author et al.] — [Key finding]
   
   ### Relevant Parameters
   - [Published value we should compare against]
   
   ### Implications for Our Work
   - [How this informs our experiments]
   ```

5. **Update AGENT_STATE.md** with new knowledge if significant
