import {it,expect} from 'vitest';
import {CommandGate} from './command-gate';
it('rejects replay, forged fields and bursts; legitimate commands resume after refill',()=>{
 const gate=new CommandGate(0),command={type:'Move',direction:'up'};
 expect(gate.accept({sequence:1,command},0)).toEqual({command});expect(gate.accept({sequence:1,command},0)).toHaveProperty('error');
 expect(gate.accept({sequence:2,command:{...command,gold:999}},0)).toHaveProperty('error');expect(gate.accept({sequence:2,command},0)).toEqual({command});
 for(let n=3;n<=28;n++)gate.accept({sequence:n,command},0);
 expect(gate.accept({sequence:100,command},0)).toEqual({error:'Za dużo komend. Zwolnij.'});
 expect(gate.accept({sequence:101,command},1000)).toEqual({command});expect(gate.accept({sequence:100,command},1000)).toHaveProperty('error');
});
