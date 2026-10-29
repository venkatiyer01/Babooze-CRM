import {useLayoutEffect} from 'react';
import {render,screen,cleanup} from '@testing-library/react';
import {afterEach,it,expect} from 'vitest';
import {useOnline} from '../src/lib/hooks';
afterEach(()=>{
 cleanup();
 Object.defineProperty(navigator,'onLine',{value:true,configurable:true});
});
it('observes a connection change between rendering and subscribing',async()=>{
 Object.defineProperty(navigator,'onLine',{value:true,configurable:true});
 function Connection(){
  const online=useOnline();
  useLayoutEffect(()=>{
   Object.defineProperty(navigator,'onLine',{value:false,configurable:true});
   window.dispatchEvent(new Event('offline'));
  },[]);
  return <span>{online?'Online':'Offline'}</span>;
 }
 render(<Connection/>);
 expect(await screen.findByText('Offline')).toBeVisible();
});
