import { ConfigService } from '@nestjs/config';
import { EmailReplyService } from './email-reply.service';

describe('Verified reply drafts', () => {
  let service: EmailReplyService, db: any, emails: any, graph: any, access: any, config: ConfigService;
  let originalFetch: typeof fetch, mode: string, posts: string[];
  const tenant='00000000-0000-4000-8000-000000000001';
  const token=`head.${Buffer.from(JSON.stringify({tid:tenant})).toString('base64url')}.sig`;
  const activity={id:'activity',exchange_immutable_id:'exact',exchange_internet_message_id:'<original@test>',exchange_tenant_id:tenant,exchange_mailbox_id:'mailbox'};
  const response=(body: any) => new Response(JSON.stringify(body),{status:200});
  beforeEach(() => {
    originalFetch=global.fetch;mode='normal';posts=[];
    config=new ConfigService({CRM_EMAIL_REPLY_ENABLED:'true',AZURE_TENANT_ID:tenant});
    db={crm_activities:{findUnique:jest.fn(async()=>({...activity})),findFirst:jest.fn(async()=>({...activity}))},user_exchange_accounts:{findUnique:jest.fn(async()=>({microsoft_user_id:'mailbox',email:'owner@test.invalid'}))}};
    emails={resolve:jest.fn(async()=>({status:'resolved',message:'verified'}))};
    graph={getValidAccessToken:jest.fn(async()=>token)};access={actor:jest.fn(async()=>({customerScope:{}}))};
    service=new EmailReplyService(db,emails,graph,access,config);
    global.fetch=jest.fn(async (input: any,options: any) => {
      const url=new URL(String(input));
      if(url.pathname.endsWith('/me')) return response({id:'mailbox',mail:'owner@test.invalid'});
      if(options.method==='POST') {
        posts.push(url.pathname);
        if(mode==='timeout')throw new Error('connection lost after acceptance');
        return response({id:'draft',isDraft:true,webLink:mode==='evil'?'https://evil.invalid':'https://outlook.office.com/mail/draft'});
      }
      return response({id:'exact',isDraft:false,parentFolderId:'folder',internetMessageId:mode==='mismatch'?'<other@test>':'<original@test>',webLink:'https://outlook.office.com/mail/original'});
    }) as any;
  });
  afterEach(()=>{global.fetch=originalFetch;});
  it.each([['reply','createReply'],['reply_all','createReplyAll']] as const)('prepares %s as a native thread draft without sending',async (reply,operation) => {
    const result=await service.prepare('user','activity',reply);
    expect(result.status).toBe('resolved');expect(posts).toEqual([`/v1.0/me/messages/exact/${operation}`]);
    expect(posts.some(path=>path.endsWith('/send')||path.endsWith('/reply'))).toBe(false);
  });
  it('coalesces repeated clicks and returns the existing short-lived draft',async()=>{
    const results=await Promise.all([service.prepare('user','activity','reply'),service.prepare('user','activity','reply')]);
    expect(results.every(x=>x.status==='resolved')).toBe(true);await service.prepare('user','activity','reply');expect(posts).toHaveLength(1);
  });
  it('never retries an uncertain Graph POST automatically',async()=>{
    mode='timeout';const result=await service.prepare('user','activity','reply');
    expect(result.message).toContain('Borradores');await service.prepare('user','activity','reply');expect(posts).toHaveLength(1);
  });
  it('rejects an identity mismatch before creating any draft',async()=>{
    mode='mismatch';expect((await service.prepare('user','activity','reply')).status).toBe('temporary_error');expect(posts).toHaveLength(0);
  });
  it('cannot create in another mailbox',async()=>{
    db.user_exchange_accounts.findUnique.mockResolvedValue({microsoft_user_id:'other',email:'other@test.invalid'});
    await service.prepare('user','activity','reply');expect(posts).toHaveLength(0);
  });
  it('requires permissions even when a recent draft exists',async()=>{
    await service.prepare('user','activity','reply');access.actor.mockRejectedValue(new Error('revoked'));
    await expect(service.prepare('user','activity','reply')).rejects.toThrow('revoked');expect(posts).toHaveLength(1);
  });
  it('returns ambiguity without creating a draft',async()=>{
    emails.resolve.mockResolvedValue({status:'ambiguous',message:'choose',candidates:[]});
    expect((await service.prepare('user','activity','reply')).status).toBe('ambiguous');expect(posts).toHaveLength(0);
  });
  it('rejects a draft link outside official Outlook origins',async()=>{
    mode='evil';expect((await service.prepare('user','activity','reply')).status).toBe('temporary_error');
  });
  it('does not access Graph while disabled',async()=>{
    config.set('CRM_EMAIL_REPLY_ENABLED','false');expect((await service.prepare('user','activity','reply')).status).toBe('disabled');expect(global.fetch).not.toHaveBeenCalled();
  });
  it('rechecks an account disconnect before the mutating POST',async()=>{
    db.user_exchange_accounts.findUnique.mockResolvedValueOnce({microsoft_user_id:'mailbox',email:'owner@test.invalid'}).mockResolvedValueOnce(null);
    await service.prepare('user','activity','reply');expect(posts).toHaveLength(0);
  });
});
