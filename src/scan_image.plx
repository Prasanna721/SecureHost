domain = "image_sensitivity_assessment"
description = """
Assessing image content sensitivity against rules to determine classification, rating, and deletion recommendations.
"""
main_pipe = "assess_image_sensitivity"

[concept.SensitivityAssessment]
description = "Structured evaluation of information sensitivity based on predefined rules."

[concept.SensitivityAssessment.structure]
classification = { type = "text", description = "The sensitivity level of the content", required = true }
sensitivity_rating = { type = "integer", description = "Numerical rating of sensitivity from 0 to 10", required = true }
should_be_deleted = { type = "boolean", description = "Whether the content should be deleted", required = true }
deletion_date = { type = "date", description = "The date when the content should be deleted in ISO format" }
reasoning = { type = "text", description = "Explanation for the sensitivity classification and deletion recommendation", required = true }

[concept.ContentAnalysis]
description = "Description of the information and elements identified within visual or textual content."
refines = "Text"

[pipe.assess_image_sensitivity]
type = "PipeSequence"
description = """
MAIN PIPE - Orchestrates the complete workflow to assess image sensitivity based on rules, analyzing content and comparing against sensitivity criteria to produce a structured assessment with classification, rating, and deletion recommendations.
"""
inputs = { image = "Image", rules = "Text" }
output = "SensitivityAssessment"
steps = [
    { pipe = "extract_image_content", result = "extracted_pages" },
    { pipe = "analyze_image_content", result = "content_analysis" },
    { pipe = "classify_sensitivity", result = "sensitivity_assessment" },
]

[pipe.extract_image_content]
type = "PipeLLM"
description = "Extracts text and visual elements from the input image for content analysis."
inputs = { image = "Image" }
output = "Text"
model = "llm_for_visual_analysis"
prompt = "Extract the text from the image: $image"

[pipe.analyze_image_content]
type = "PipeLLM"
description = """
Analyzes the extracted content and visual elements to identify what information is present in the image.
"""
inputs = { image = "Image", extracted_pages = "Text" }
output = "ContentAnalysis"
model = "llm_for_visual_analysis"
system_prompt = """
You are an expert content analyst. Your task is to analyze visual and textual content to produce a structured ContentAnalysis describing what information is present.
"""
prompt = """
Analyze the following image and its extracted content to identify what information is present.

$image

@extracted_pages

Provide a comprehensive analysis of the content, including:
- What types of information are visible
- Key textual elements and their significance
- Visual elements and their purpose
- Overall context and subject matter

Be thorough and descriptive in your analysis.
"""

[pipe.classify_sensitivity]
type = "PipeLLM"
description = """
Compares the content analysis against the provided rules to determine sensitivity classification (public, internal, confidential, restrictive), rating out of 10, and deletion recommendation with structured JSON output.
"""
inputs = { content_analysis = "ContentAnalysis", rules = "Text" }
output = "SensitivityAssessment"
model = "llm_to_answer_hard_questions"
system_prompt = """
You are an expert in information security and data classification. Your task is to evaluate content and determine its sensitivity level based on provided rules. You will generate a structured assessment.
"""
prompt = """
Based on the content analysis and the classification rules provided, determine the sensitivity classification of the content.

@content_analysis

@rules

Evaluate the content against the rules and provide a comprehensive sensitivity assessment.
"""
