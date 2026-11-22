# Documentation and Comment Language

Use ASD-STE100 Simplified Technical English for all documentation that you write or revise, including:

- in Markdown files
- in code comments
- in pull request bodies and comments
- in ticket bodies, comments, and acceptance criteria (including all systems such as Jira or GitHub issuse)

Beyond using ASD-STE100, write documentation using the following guidelines:

- Use short sentences with one topic per sentence
- Use active voice and simple verb forms
- Use direct instructions for procedures
- Use one term for each concept. Avoid ambiguous pronouns and unnecessary words
- Keep conditions, actions, and results explicit
- Preserve technical meaning, requirements, exceptions, and warnings
- Keep exact technical names, code identifiers, commands, paths, and quotations.
- Treat necessary project or domain terms as allowed technical vocabular

## Keep code comments terse

- DO write inline code comments that are short, generally no more than one line
- Assume competent readers who understand the code, application, and common coding practices
- DO NOT make justifications or litigate review feedback in comments.
- DO NOT write mutliple sentences or paragraphs of explanatory prose. If this feels necessary, the code is too complex. 

Note that the prohibition on longer comments here applies to inline comments, and not JSDoc/TSDoc
or similar doc comments. These may be longer, but still should probably be limited to no more than
1-3 short paragraphs. Code examples serve a much stronger documentation purpose than prose in most cases.

## Describe the current final state, not previous iterations or the planned future

Describe the curent end state and the contract that a consumer can rely on. Do not compare with prior 
states or alternatives  unless such comparison is the explicit point of the documentation. Examples:

  - BAD: "a separate role rather than widening the existing one"
  - BAD: "changed from the original approach" / "no longer does X" / "Option 2 (the one we picked)"
  - GOOD: "Dedicated CDK deploy role, scoped to assuming the cdk-* bootstrap roles"

Keep future requirements in planning documents such as OpenSpec changes or issue tracker artifacts. If
documentation describes behavior that the implementation does not provide, report the mismatch. Do not
implement unscoped features to make the documentation true.
