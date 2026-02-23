# User Guide: Configuration File Structure and Markdown Syntax

This guide explains how to create configuration files that define stages, questions, variables, and facilitator prompts with markdown-enhanced content. Follow this structure and syntax to build properly formatted and feature-rich files.

---

## File Structure
The configuration file is structured into **stages**, **variables**, **questions**, **facilitator prompts**, and **content**. Each type has specific indicators to denote its purpose.

### 1. **Stages**
Stages define major sections in your file. Use `@` followed by the stage name.

Example:
```
@ Stage 1: Initial Incident
```
Everything after this line belongs to this stage until the next stage declaration.

---

### 2. **Key-Value Variables**
Define variables using `!`, followed by a key and value separated by a colon (`:`). For multi-line values, omit the colon.

Examples:
```
! title: Example Scenario Title
! description
This is a multi-line description.
It continues on multiple lines.
```

---

### 3. **Questions**
Use `?` to define a question. Answers are listed under it, each starting with `+`.

Example:
```
? What is your primary concern?
+ Security breach
+ Data loss
+ Service downtime
```

---

### 4. **Facilitator Prompts**
Use `#` to declare facilitator prompts. Each prompt starts with `+`.

Example:
```
# facilitator prompts
+ Ask the team about their incident response plan.
+ Discuss the potential risks of delaying action.
+ Encourage brainstorming on immediate containment strategies.
```

---

## Markdown Syntax
Enhance your content using Markdown. Below are supported features:

### 1. **Bold Text**
Wrap text in `**` for bold.
```
**Important:** Take immediate action.
```
Output:
**Important:** Take immediate action.

### 2. **Italic Text**
Wrap text in `*` for italics.
```
This is *italicized* text.
```
Output:
This is *italicized* text.

### 3. **Lists**
Use `-` for bullet points and numbers followed by `.` for numbered lists.
```
- Item 1
- Item 2

1. Step one
2. Step two
```
Output:
- Item 1
- Item 2

1. Step one
2. Step two

### 4. **Blockquotes**
Use `~` for blockquotes.
```
~ This is a quoted statement.
```
Output:
> This is a quoted statement.

### 5. **Embedded Images**
Use `%` to embed an image. Format: `%[alt text](url)`.
```
%[Sample Image](https://example.com/image.jpg)
```
Output:
An image appears with the given URL.

### 6. **Embedded Videos**
Use `%%` to embed a video. Format: `%%[alt text](url)`.
```
%%[Sample Video](https://example.com/video.mp4)
```
Output:
A video player appears for the provided URL.

---

## Full Example
Here’s a complete configuration file:
```
! title: Security Breach Response Plan
! author: Jane Doe

@ Stage 1: Identification
! description
An unusual login attempt was detected.

# facilitator prompts
+ Ask the team to identify possible attack vectors.
+ Discuss recent security training and preparedness.
+ Explore options for immediate response.

? What action should be taken first?
+ Notify the security team
+ Investigate the login origin
+ Block the IP address

%[Incident Diagram](https://example.com/diagram.png)

@ Stage 2: Containment
! description
Contain the breach by isolating affected systems.

# facilitator prompts
+ Review logs for additional suspicious activity.
+ Coordinate with IT to isolate compromised systems.
+ Plan a communication strategy for stakeholders.

%%[Training Video](https://example.com/training.mp4)
```

---

Use this guide to create structured, readable, and actionable configuration files. Let us know if you need further assistance!

