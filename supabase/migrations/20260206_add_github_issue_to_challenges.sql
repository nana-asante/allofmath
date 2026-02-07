-- Add github_issue_number to track which issue was created for each challenge
alter table public.answer_challenges
  add column if not exists github_issue_number integer;

create index if not exists answer_challenges_issue_idx
  on public.answer_challenges(github_issue_number)
  where github_issue_number is not null;
