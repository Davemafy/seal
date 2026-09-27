import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('result surface design contract',()=>{
 it('keeps Summary visually anchored while deeper reasoning stays progressive',()=>{
  const app=readFileSync('app/seal-app.tsx','utf8');
  const css=readFileSync('app/workspace.css','utf8');
  expect(app).toContain('className="decision-overview"');
  expect(app).toContain('className="decision-visual"');
  expect(app).toContain('className="decision-artifact"');
  expect(app).toContain('aria-label="Check snapshot"');
  expect(app).toContain('data-testid="play-evidence-review"');
  expect(app).not.toContain('setTimeout(()=>startStory(),260)');
  expect(css).toContain('Visual result composition: focused reading column + contextual artifact.');
  expect(app).toContain("const primaryRoute=file?.sample");
  expect(app).toContain("resultStatusLabel=file?.sample");
  expect(app).toContain("workspaces.filter(item=>item.status!=='idle'||item.id===workspaceId)");
  expect(app).not.toContain('<select value={displayLocale}');
  expect(app).toContain("setWorkspaceMotion({id,fromId:activeWorkspace,direction:'forward'})");
  expect(app).toContain("},[activeWorkspace]);");
  expect(app).toContain('data-workspace-id={workspace.id}');
  expect(app).toContain("workspaceMotion?.id===workspace.id");
  expect(app).toContain("workspaceMotion?.fromId===workspace.id");
  expect(css).toContain('@keyframes workspace-sheet-rise');
  expect(css).toContain('transform:translate3d(0,100dvh,0)');
  expect(css).toContain('@keyframes workspace-page-recede');
  expect(css).toContain('scale(.94)');
  expect(css).toContain('.workspace-drawer-layer.is-open');
  expect(app).not.toContain('finishWorkspaceSwipe');
  expect(app).not.toContain('onTouchStart={beginWorkspaceSwipe}');
  expect(app).toContain('name="workspaces"');
  expect(css).toContain('translate3d(0,100dvh,0)');
  expect(css).toContain('font-size:37px!important');
 });
});
