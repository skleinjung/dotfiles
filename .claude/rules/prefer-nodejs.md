# Preference for Node.js

When building scripts and utilities (for local development use, execution in CI/CD environments, etc.), you should 
prefer Node.js as the implementation langauge of choice. Reach for Bash only in situations where no Node.js runtime is 
available for the task is highly favorable to bash's capabilities. Reach for Python or other scripting languages only
when required (feature not available in Node.js, integration with a specific library that only exists in another
language, etc.)

This preference only applies to scripts which are created as permanent parts of a project. For one-off tasks performed
by an agent (e.g. scanning/updating files, verifying an API, one-off local testing, etc.) the agent may choose whatever
tools are preferred.
