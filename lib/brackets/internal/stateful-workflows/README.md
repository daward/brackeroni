# Stateful Bracket Workflows

This directory contains bracket code where persistence, authorization-sensitive state, and transactional orchestration are intentionally coupled.

Prefer testing this behavior through public bracket handles and directory APIs. Do not add direct unit tests against these modules just to raise coverage; those tests tend to lock the SQL/query sequence instead of the domain contract.

Changes here are higher risk than changes to pure engine code or handle adapters. Before editing, identify the public flow that exercises the behavior and add or update a public-interface regression test when the behavior is observable.
