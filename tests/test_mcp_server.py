from __future__ import annotations

import sys
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client


class McpServerTests(unittest.IsolatedAsyncioTestCase):
    async def test_stdio_server_lists_and_calls_tools(self):
        server = StdioServerParameters(
            command=sys.executable,
            args=[
                "-c",
                (
                    "import runpy, sys; "
                    f"sys.path.insert(0, {str(ROOT / 'src')!r}); "
                    "runpy.run_module('career_matcher.mcp_server', run_name='__main__')"
                ),
            ],
            cwd=ROOT,
        )
        async with stdio_client(server) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                tools = await session.list_tools()
                names = {tool.name for tool in tools.tools}
                self.assertEqual(
                    names,
                    {
                        "get_job_taxonomy",
                        "rank_candidate_profile",
                        "analyze_job_description",
                        "compare_role_profile_options",
                        "build_readiness_plan",
                    },
                )
                result = await session.call_tool("get_job_taxonomy", {})
                self.assertFalse(result.isError)
                self.assertEqual(result.structuredContent["role_profile_count"], 5)


if __name__ == "__main__":
    unittest.main()
