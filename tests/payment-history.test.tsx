import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {Timestamp} from 'firebase/firestore';
import type {User} from 'firebase/auth';
import type {Gig,Payment,FollowUp,Profile} from '../src/lib/domain';
import {Session} from '../src/lib/session';
import Payments from '../src/pages/Payments';

const state=vi.hoisted(()=>({gig:null as Gig|null,payment:null as Payment|null,followUps:[] as FollowUp[]}));
vi.mock('../src/lib/data',async()=>{
 const {where,orderBy,Timestamp}=await import('firebase/firestore');
 return {
  where,orderBy,
  page:vi.fn(async(name:string)=>({rows:name==='paymentFollowUps'?[...state.followUps]:[],more:false,cursor:undefined})),
  load:vi.fn(async(name:string)=>{
   if(name==='gigs')return state.gig;
   if(name==='paymentRecords'&&state.payment)return state.payment;
   throw new Error('Record no longer exists.');
  }),
  savePayment:vi.fn(async()=>{
   const g=state.gig!;
   const audit={createdAt:g.createdAt,updatedAt:g.updatedAt,createdByUid:g.createdByUid,createdByName:g.createdByName,updatedByUid:g.updatedByUid,updatedByName:g.updatedByName,version:1};
   state.payment={id:g.id,gigId:g.id,venueId:g.venueId,status:'Follow-up required',...audit};
   state.followUps=[{id:'follow-1',type:'Payment',venueId:g.venueId,venueName:g.venueName,gigId:g.id,paymentId:g.id,scheduledAt:Timestamp.fromDate(new Date('2000-01-01T00:00:00Z')),status:'Pending',note:'',previousId:'',nextId:'',completedAt:null,completedByUid:'',completedByName:'',...audit}];
  }),
  deletePayment:vi.fn(),finishFollow:vi.fn(),deleteFollow:vi.fn()
 };
});
beforeEach(()=>{
 vi.clearAllMocks();
 const timestamp=Timestamp.fromDate(new Date('2000-01-01T00:00:00Z'));
 state.gig={id:'gig-1',name:'Friday live',venueId:'venue-1',venueName:'Blue Note',date:'2000-01-01',time:'20:00',payoutPaise:100001,status:'Completed',deleting:false,createdAt:timestamp,updatedAt:timestamp,createdByUid:'member-1',createdByName:'Band member',updatedByUid:'member-1',updatedByName:'Band member',version:1};
 state.payment=null;
 state.followUps=[];
});
afterEach(cleanup);
it('shows a newly saved payment follow-up without reloading or manually refreshing history',async()=>{
 const user={uid:'member-1',displayName:'Band member'} as User;
 const profile={id:user.uid,displayName:'Band member',email:'band@example.com',photoURL:'',theme:'system',createdAt:state.gig!.createdAt,lastActiveAt:state.gig!.updatedAt} satisfies Profile;
 render(<Session.Provider value={{user,profile,reload:async()=>{}}}><MemoryRouter initialEntries={['/payments/gig-1']}><Routes><Route path="/payments/*" element={<Payments/>}/></Routes></MemoryRouter></Session.Provider>);
 const status=await screen.findByLabelText('Payment status',{exact:true});
 await screen.findByText('No records yet.');
 fireEvent.change(status,{target:{value:'Follow-up required'}});
 fireEvent.change(screen.getByLabelText('Follow-up date (IST)'),{target:{value:'2000-01-01'}});
 fireEvent.change(screen.getByLabelText('Follow-up time (IST)'),{target:{value:'10:00'}});
 fireEvent.click(screen.getByRole('button',{name:'Save changes',exact:true}));
 expect(await screen.findByText('Saved successfully.')).toBeVisible();
 expect(await screen.findByText('Payment · Overdue')).toBeVisible();
 expect(screen.queryByText('No records yet.')).not.toBeInTheDocument();
});
