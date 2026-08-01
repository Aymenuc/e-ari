/**
 * Candidate AI systems by sector — prompts, not detections.
 *
 * The readiness assessment measures how well an organisation governs AI; it
 * never asks which systems they run, so nothing here is derived from anyone's
 * answers. These are the deployments that are common in each sector, offered
 * so the reader can recognise their own rather than recall them from nothing.
 * A compliance officer shown "clinical triage / diagnostic imaging / patient
 * scheduling" remembers three systems they would not have listed unprompted —
 * which is the whole point, and the reason the copy must say "which of these
 * do you run" and never "we found".
 *
 * Deliberately absent: riskTier. Whether a system is high-risk under Annex III
 * depends on its specific purpose and deployment, which the classifier decides
 * from the registered detail. Guessing it here would put a legal conclusion on
 * a checkbox.
 *
 * `deployerRole` defaults to "deployer" because that is what an organisation
 * running a bought-in system is, and it is the common case for every entry
 * below. It stays editable on the registry entry afterwards.
 */

export interface CandidateSystem {
  /** Short name, used as the registry entry's name. */
  name: string;
  /** What it does, in the words a non-technical officer would use. */
  description: string;
  /** Why it is deployed — the registry's `purpose` field. */
  purpose: string;
  /** Who it affects, when that is obvious enough to prefill honestly. */
  populationsAffected?: string;
}

const CATALOGUE: Record<string, CandidateSystem[]> = {
  healthcare: [
    { name: 'Clinical triage or risk scoring', description: 'Software that prioritises patients or flags deterioration risk from clinical data.', purpose: 'Prioritise clinical attention and allocate capacity.', populationsAffected: 'Patients' },
    { name: 'Diagnostic imaging support', description: 'Image analysis that highlights findings for a radiologist or clinician.', purpose: 'Assist diagnosis and reduce missed findings.', populationsAffected: 'Patients' },
    { name: 'Patient scheduling and capacity', description: 'Demand forecasting or automated scheduling across clinics and theatres.', purpose: 'Reduce waiting times and idle capacity.', populationsAffected: 'Patients, staff' },
    { name: 'Clinical coding and billing', description: 'Automated coding of episodes for reimbursement or reporting.', purpose: 'Reduce manual coding effort and coding error.' },
    { name: 'Recruitment screening', description: 'CV screening or ranking for clinical and non-clinical roles.', purpose: 'Shortlist candidates at volume.', populationsAffected: 'Job applicants' },
  ],
  finance: [
    { name: 'Credit scoring or affordability', description: 'Models that score applicants for lending or set limits.', purpose: 'Decide or support lending decisions.', populationsAffected: 'Loan and credit applicants' },
    { name: 'Fraud and AML detection', description: 'Transaction monitoring that flags suspicious activity for review.', purpose: 'Detect fraud and meet AML obligations.', populationsAffected: 'Customers' },
    { name: 'Insurance pricing or claims triage', description: 'Risk pricing, or routing and prioritising claims.', purpose: 'Price risk and handle claims at volume.', populationsAffected: 'Policyholders, claimants' },
    { name: 'Customer service assistant', description: 'Chat or voice assistant handling customer enquiries.', purpose: 'Resolve routine enquiries without an agent.', populationsAffected: 'Customers' },
    { name: 'Recruitment screening', description: 'CV screening or ranking for open roles.', purpose: 'Shortlist candidates at volume.', populationsAffected: 'Job applicants' },
  ],
  government: [
    { name: 'Benefits or eligibility assessment', description: 'Systems supporting decisions on entitlement or eligibility.', purpose: 'Assess claims consistently at volume.', populationsAffected: 'Claimants and residents' },
    { name: 'Case triage and allocation', description: 'Prioritising or routing casework across teams.', purpose: 'Allocate limited caseworker capacity.', populationsAffected: 'Service users' },
    { name: 'Fraud or risk detection', description: 'Flagging claims or filings for investigation.', purpose: 'Target investigative resource.', populationsAffected: 'Claimants, taxpayers' },
    { name: 'Citizen-facing assistant', description: 'Chat or voice assistant answering public enquiries.', purpose: 'Handle routine enquiries at scale.', populationsAffected: 'Residents' },
    { name: 'Document processing', description: 'Extracting and classifying information from submitted documents.', purpose: 'Reduce manual handling of forms and correspondence.' },
  ],
  education: [
    { name: 'Admissions or placement scoring', description: 'Ranking or scoring applicants for admission or placement.', purpose: 'Handle application volume consistently.', populationsAffected: 'Applicants, students' },
    { name: 'Automated assessment or grading', description: 'Marking or scoring student work, in whole or in part.', purpose: 'Mark at volume and speed feedback.', populationsAffected: 'Students' },
    { name: 'Proctoring or integrity monitoring', description: 'Monitoring examinations for suspected misconduct.', purpose: 'Preserve assessment integrity at distance.', populationsAffected: 'Students' },
    { name: 'Student risk and retention', description: 'Flagging students at risk of dropping out or failing.', purpose: 'Target pastoral and academic support.', populationsAffected: 'Students' },
    { name: 'Teaching or research assistant', description: 'Generative tools used to prepare material or support research.', purpose: 'Reduce preparation and literature effort.' },
  ],
  manufacturing: [
    { name: 'Predictive maintenance', description: 'Predicting equipment failure from sensor data.', purpose: 'Avoid unplanned downtime.' },
    { name: 'Visual quality inspection', description: 'Image-based defect detection on the line.', purpose: 'Catch defects earlier and more consistently.' },
    { name: 'Demand and supply forecasting', description: 'Forecasting demand, stock or lead times.', purpose: 'Plan production and inventory.' },
    { name: 'Workforce scheduling', description: 'Allocating shifts and tasks across the workforce.', purpose: 'Match labour to production plan.', populationsAffected: 'Employees' },
    { name: 'Recruitment screening', description: 'CV screening or ranking for open roles.', purpose: 'Shortlist candidates at volume.', populationsAffected: 'Job applicants' },
  ],
  retail: [
    { name: 'Recommendation and personalisation', description: 'Ranking products or content per customer.', purpose: 'Increase relevance and conversion.', populationsAffected: 'Customers' },
    { name: 'Dynamic pricing', description: 'Adjusting prices from demand, stock or competitor signals.', purpose: 'Optimise margin and sell-through.', populationsAffected: 'Customers' },
    { name: 'Demand forecasting and replenishment', description: 'Predicting demand to drive ordering.', purpose: 'Reduce stockouts and overstock.' },
    { name: 'Customer service assistant', description: 'Chat or voice assistant handling customer enquiries.', purpose: 'Resolve routine enquiries without an agent.', populationsAffected: 'Customers' },
    { name: 'Workforce scheduling', description: 'Allocating shifts across stores or sites.', purpose: 'Match staffing to footfall.', populationsAffected: 'Employees' },
  ],
  technology: [
    { name: 'Product feature using a foundation model', description: 'A customer-facing feature built on a third-party or in-house model.', purpose: 'Deliver the product capability itself.', populationsAffected: 'End users' },
    { name: 'Coding assistant', description: 'Generative assistance inside the development workflow.', purpose: 'Increase engineering throughput.' },
    { name: 'Customer support assistant', description: 'Chat assistant handling inbound support.', purpose: 'Deflect and speed up support.', populationsAffected: 'Customers' },
    { name: 'Recruitment screening', description: 'CV screening or ranking for open roles.', purpose: 'Shortlist candidates at volume.', populationsAffected: 'Job applicants' },
    { name: 'Content or abuse moderation', description: 'Automated classification of user content.', purpose: 'Enforce policy at platform scale.', populationsAffected: 'End users' },
  ],
  energy: [
    { name: 'Load and demand forecasting', description: 'Forecasting consumption or generation.', purpose: 'Balance the network and plan procurement.' },
    { name: 'Predictive maintenance', description: 'Predicting asset failure across the network.', purpose: 'Avoid outages and unplanned work.' },
    { name: 'Grid or asset optimisation', description: 'Dispatch, routing or storage optimisation.', purpose: 'Reduce cost and losses.' },
    { name: 'Customer billing and usage analytics', description: 'Consumption analysis, anomaly and theft detection.', purpose: 'Bill accurately and detect anomalies.', populationsAffected: 'Customers' },
    { name: 'Field workforce scheduling', description: 'Allocating engineers to jobs.', purpose: 'Match crews to work.', populationsAffected: 'Employees' },
  ],
  general: [
    { name: 'Recruitment screening', description: 'CV screening or ranking for open roles.', purpose: 'Shortlist candidates at volume.', populationsAffected: 'Job applicants' },
    { name: 'Customer service assistant', description: 'Chat or voice assistant handling enquiries.', purpose: 'Resolve routine enquiries without an agent.', populationsAffected: 'Customers' },
    { name: 'Generative writing assistant', description: 'Staff use of generative tools for documents and correspondence.', purpose: 'Reduce drafting effort.' },
    { name: 'Forecasting and planning', description: 'Demand, financial or resource forecasting.', purpose: 'Plan capacity and budget.' },
    { name: 'Document processing', description: 'Extracting and classifying information from documents.', purpose: 'Reduce manual handling.' },
  ],
};

/** Candidates for a sector, falling back to the cross-industry set. */
export function candidateSystemsForSector(sectorId: string | null | undefined): CandidateSystem[] {
  return CATALOGUE[(sectorId ?? '').trim()] ?? CATALOGUE.general!;
}
