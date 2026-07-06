// Review gate: block a PR from merging while an automated reviewer (Codex,
// Copilot, …) has a P1/P2 finding that hasn't been addressed.
//
// Two failure modes are covered:
//   1. Inline review threads from a bot carrying a P1/P2 badge that are still
//      unresolved. (Branch protection's "require conversation resolution" also
//      catches these; this names them so the failing check says which thread.)
//   2. Review-BODY findings (top-level review summaries, e.g. Codex's "💡 Codex
//      Review"). These are not threads, so they can never be "resolved" — they
//      slipped PR #89 straight past merge. A body finding is considered addressed
//      when the reviewer's latest non-dismissed review no longer carries the
//      badge (a clean re-review) OR a human responded on the PR after the review
//      — either an issue comment or a review of their own.
//
// Only automated (bot) reviewers gate: a human writing "P1" in a discussion
// thread must never fail the build, and a maintainer dismissing a bot review
// clears it.
//
// The result is published as a commit status on the PR head SHA under a fixed
// context so it can be made a required check regardless of which event triggered
// the run. Invoked from review-gate.yml via actions/github-script.

const STATUS_CONTEXT = 'Review gate (P1/P2 addressed)';

// Matches Codex's shields.io badge (`![P1 Badge](…)`) and a bare `P1`/`P2` token.
const hasP1P2 = (text) =>
  /!\[P[12] Badge\]/.test(text || '') || /\bP[12]\b/.test(text || '');

const isBot = (login) => !!login && login.endsWith('[bot]');

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;

  // Resolve the PR number across pull_request_target / pull_request_review /
  // pull_request_review_thread / issue_comment.
  let prNumber;
  if (context.payload.pull_request) {
    prNumber = context.payload.pull_request.number;
  } else if (context.payload.issue && context.payload.issue.pull_request) {
    prNumber = context.payload.issue.number;
  }
  if (!prNumber) {
    core.info('Event is not associated with a pull request; nothing to gate.');
    return;
  }

  const { data: pr } = await github.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });
  const headSha = pr.head.sha;
  const problems = [];

  // (1) Unresolved P1/P2 inline threads — bot authors only.
  const threadQuery = `
    query($owner:String!, $repo:String!, $pr:Int!, $cursor:String) {
      repository(owner:$owner, name:$repo) {
        pullRequest(number:$pr) {
          reviewThreads(first:100, after:$cursor) {
            pageInfo { hasNextPage endCursor }
            nodes {
              isResolved
              path
              line
              comments(first:1) { nodes { author { login } body } }
            }
          }
        }
      }
    }`;
  let cursor = null;
  do {
    const res = await github.graphql(threadQuery, {
      owner,
      repo,
      pr: prNumber,
      cursor,
    });
    const threads = res.repository.pullRequest.reviewThreads;
    for (const node of threads.nodes) {
      const first = node.comments.nodes[0];
      if (!first) continue;
      // Gate on automated reviewers only — a human's "P1" discussion is not a
      // blocking finding.
      if (
        !node.isResolved &&
        isBot(first.author?.login) &&
        hasP1P2(first.body)
      ) {
        problems.push(
          `Unresolved P1/P2 thread from ${first.author.login} ` +
            `at ${node.path}:${node.line ?? '?'} — resolve it or reply with a rebuttal.`
        );
      }
    }
    cursor = threads.pageInfo.hasNextPage ? threads.pageInfo.endCursor : null;
  } while (cursor);

  // (2) Review-body P1/P2 findings (no thread to resolve).
  const reviews = (
    await github.paginate(github.rest.pulls.listReviews, {
      owner,
      repo,
      pull_number: prNumber,
    })
  ).sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: prNumber,
  });

  // A human "responds" either with a PR issue comment or with a review of their
  // own — both count as addressing a bot's review-body finding.
  const humanResponseTimes = [
    ...comments
      .filter((c) => !isBot(c.user.login))
      .map((c) => new Date(c.created_at)),
    ...reviews
      .filter((r) => !isBot(r.user.login) && r.submitted_at)
      .map((r) => new Date(r.submitted_at)),
  ];

  // Keep only each bot reviewer's most recent *non-dismissed* review (ascending
  // sort ⇒ last wins). A dismissed review is treated as retracted.
  const latestByAuthor = {};
  for (const r of reviews) {
    if (r.state === 'DISMISSED') continue;
    if (isBot(r.user.login) && r.body) latestByAuthor[r.user.login] = r;
  }
  for (const [login, review] of Object.entries(latestByAuthor)) {
    if (!hasP1P2(review.body)) continue; // latest review is clean ⇒ addressed
    const reviewTime = new Date(review.submitted_at);
    const addressed = humanResponseTimes.some((t) => t > reviewTime);
    if (!addressed) {
      problems.push(
        `Review-body P1/P2 from ${login} is unaddressed — reply on the PR, ` +
          `or re-run the reviewer until its summary is clean.`
      );
    }
  }

  const state = problems.length ? 'failure' : 'success';
  const description = problems.length
    ? `${problems.length} unaddressed P1/P2 review item(s)`
    : 'No unaddressed P1/P2 review items';

  await github.rest.repos.createCommitStatus({
    owner,
    repo,
    sha: headSha,
    state,
    context: STATUS_CONTEXT,
    description: description.slice(0, 140),
  });

  if (problems.length) {
    core.setFailed([description, ...problems.map((p) => `  • ${p}`)].join('\n'));
  } else {
    core.info(description);
  }
};
