import {it,expect} from 'vitest';
import {creatureFacing,creatureFrames} from './creature-facing';
it('faces actual pursuit and return steps in all four directions, retaining the stopped pose',()=>{
  const from={x:20,y:20};
  for(const [to,direction] of [[{x:20,y:19},'up'],[{x:20,y:21},'down'],[{x:19,y:20},'left'],[{x:21,y:20},'right']] as const){
    expect(creatureFacing(from,to,'down')).toBe(direction);
    expect(creatureFacing(to,to,direction)).toBe(direction);
  }
  expect(creatureFrames.up.start).not.toBe(creatureFrames.down.start);
  expect(creatureFrames.left.flipX).toBe(true);expect(creatureFrames.up.flipX).toBe(false);
});
