import asyncio
import json
import sys
import os
from pipelex.pipeline.execute import execute_pipeline
from pipelex.pipelex import Pipelex


async def run_pipeline():
    try:
        # Get project root (parent of src directory)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(script_dir)
        results_dir = os.path.join(project_root, "results")

        # Stay in project root for Pipelex setup (where .pipelex/ folder is)
        os.chdir(project_root)
        print(f"Working directory: {os.getcwd()}")

        # Read inputs from results directory
        inputs_path = os.path.join(results_dir, "inputs.json")
        with open(inputs_path, encoding="utf-8") as f:
            inputs = json.load(f)

        pipe_output = await execute_pipeline(
            pipe_code="assess_image_sensitivity", inputs=inputs
        )

        # Get the structured result
        result = pipe_output.model_dump(serialize_as_any=True)

        # Save result to results directory for Node.js to read
        result_path = os.path.join(results_dir, "pipelex_result.json")
        with open(result_path, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, default=str)

        print("✅ Pipelex analysis completed successfully")

    except Exception as e:
        print(f"❌ Pipelex analysis failed: {str(e)}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    Pipelex.make()
    asyncio.run(run_pipeline())
