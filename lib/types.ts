import {z} from 'zod';

export const extractionSchema=z.object({
 court_name:z.string(),court_location:z.string(),case_or_docket_number:z.string(),juror_or_reference_number:z.string(),judge_or_official:z.string(),notice_date:z.string(),reporting_date:z.string(),phone_numbers:z.array(z.string()),emails:z.array(z.string()),urls:z.array(z.string()),delivery_method:z.string(),payment_demand:z.object({amount:z.string(),method:z.string(),url:z.string()}),information_requests:z.array(z.string()),threats:z.array(z.string()),uncertain_fields:z.array(z.string())
}).strict();
export type Extraction=z.infer<typeof extractionSchema>;
export const emptyExtraction=():Extraction=>({court_name:'',court_location:'',case_or_docket_number:'',juror_or_reference_number:'',judge_or_official:'',notice_date:'',reporting_date:'',phone_numbers:[],emails:[],urls:[],delivery_method:'',payment_demand:{amount:'',method:'',url:''},information_requests:[],threats:[],uncertain_fields:[]});

export const actionKindSchema=z.enum(['pay','contact','navigate','disclose','appear','other']);
export const actionTargetSchema=z.enum(['money','phone','url','qr','information','place','date','unknown']);
export type ActionKind=z.infer<typeof actionKindSchema>;
export type ActionTarget=z.infer<typeof actionTargetSchema>;
export type ActionNode={
 verb:string;
 kind:ActionKind;
 object:string;
 target_type:ActionTarget;
 target_value:string;
 qualifiers:string[];
 source_text:string;
};

export const verdictSchema=z.enum(['MATCH','MISMATCH','COULD_NOT_VERIFY']);
export type Verdict=z.infer<typeof verdictSchema>;
export type ClaimType='court'|'location'|'docket'|'juror'|'reporting_date'|'phone'|'email'|'url'|'payment'|'information'|'threat'|'official'|'delivery'|'notice_date'|'action'|'authority';
export type Token={page:number;text:string;x:number;y:number;width:number;height:number;start:number;end:number;confidence?:number};
export type Claim={
 id:string;
 type:ClaimType;
 label:string;
 value:string;
 exact_source_text:string;
 page:number;
 source_bbox?:{x:number;y:number;width:number;height:number};
 source_token_range?:[number,number];
 context?:string;
 normalization?:Record<string,string>;
 field_confidence?:number;
 verification_eligible?:boolean;
 action?:ActionNode;
};
export type Evidence={title:string;url:string;excerpt:string;checked_at:string;source_mode:'LIVE'|'SNAPSHOT'};
export type Result={claim_id:string;verdict:Verdict;explanation:string;evidence:Evidence[];resolver_id:string;normalized_comparison?:Record<string,string>};
export type SourceSignal={id:string;kind:'OFFICIAL_WARNING'|'KNOWN_PATTERN'|'SOURCE_CONFLICT';title:string;summary:string;evidence:Evidence[]};
export type SafeAction={title:string;summary:string;primary_url:string;primary_label:string;steps:string[];evidence:Evidence[]};
export type Verification={results:Result[];contact?:{name?:string;phone:string;website:string;source:Evidence};resolver_id:string;signals?:SourceSignal[];safe_action?:SafeAction};

export const claimSchema=z.object({
 id:z.string(),
 type:z.enum(['court','location','docket','juror','reporting_date','phone','email','url','payment','information','threat','official','delivery','notice_date','action','authority']),
 label:z.string(),
 value:z.string(),
 exact_source_text:z.string(),
 page:z.number(),
 context:z.string().optional(),
 source_token_range:z.tuple([z.number(),z.number()]).optional(),
 source_bbox:z.object({x:z.number(),y:z.number(),width:z.number(),height:z.number()}).optional(),
 normalization:z.record(z.string(),z.string()).optional(),
 field_confidence:z.number().min(0).max(100).optional(),
 verification_eligible:z.boolean().optional(),
 action:z.object({verb:z.string(),kind:actionKindSchema,object:z.string(),target_type:actionTargetSchema,target_value:z.string(),qualifiers:z.array(z.string()),source_text:z.string()}).optional()
});
