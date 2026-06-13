'use server';
/**
 * @fileOverview This file implements a Genkit flow to generate a post-election analysis report.
 *
 * - generatePostElectionAnalysisReport - A function that triggers the election analysis report generation.
 * - PostElectionAnalysisReportInput - The input type for the report generation.
 * - PostElectionAnalysisReportOutput - The return type for the generated report.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * Defines the input schema for the post-election analysis report.
 * This schema includes overall election statistics, detailed results per position and candidate,
 * and turnout data for each class.
 */
const PostElectionAnalysisReportInputSchema = z.object({
  electionName: z.string().describe('The name of the election.'),
  totalEligibleVoters: z.number().describe('The total number of eligible voters for the election.'),
  totalVotesCast: z.number().describe('The total number of votes cast across all positions and classes.'),
  overallTurnoutPercentage: z.number().describe('The overall voting turnout percentage for the election.'),
  positions: z.array(z.object({
    id: z.string().describe('The unique identifier for the electoral position.'),
    name: z.string().describe('The name of the electoral position (e.g., School Prefect).'),
    candidates: z.array(z.object({
      id: z.string().describe('The unique identifier for the candidate.'),
      fullName: z.string().describe('The full name of the candidate.'),
      votes: z.number().describe('The number of votes received by the candidate for this position.'),
      percentage: z.number().describe('The percentage of votes received by the candidate relative to the total votes for this position.'),
    })).describe('A list of candidates for this position with their vote counts and percentages.'),
  })).describe('A list of all electoral positions, each containing their candidates and voting results.'),
  classTurnout: z.array(z.object({
    id: z.string().describe('The unique identifier for the class.'),
    name: z.string().describe('The name of the class (e.g., Grade 6A).'),
    population: z.number().describe('The total student population of the class.'),
    votesCast: z.number().describe('The number of votes cast by students from this class.'),
    turnoutPercentage: z.number().describe('The voting turnout percentage for this specific class.'),
  })).describe('A list of classes, including their population, votes cast, and calculated turnout percentage.'),
});
export type PostElectionAnalysisReportInput = z.infer<typeof PostElectionAnalysisReportInputSchema>;

/**
 * Defines the output schema for the post-election analysis report.
 * This schema structures the AI-generated report into a title, executive summary,
 * key statistics, analysis of voting patterns, demographic insights, and recommendations.
 */
const PostElectionAnalysisReportOutputSchema = z.object({
  reportTitle: z.string().describe('A concise and informative title for the election analysis report.'),
  executiveSummary: z.string().describe('A brief, high-level overview of the most significant findings and conclusions from the election analysis.'),
  keyStatistics: z.object({
    totalEligibleVoters: z.number().describe('The total number of eligible voters.'),
    totalVotesCast: z.number().describe('The total number of votes cast across all positions.'),
    overallTurnoutPercentage: z.number().describe('The overall voting turnout percentage for the entire election.'),
    mostVotedCandidate: z.string().describe('The full name of the candidate who received the highest number of votes across all positions, if applicable.'),
    highestTurnoutClass: z.string().describe('The name of the class that achieved the highest voting turnout percentage.'),
  }).describe('A summary of essential quantitative data and top-level facts about the election.'),
  votingPatternsAnalysis: z.string().describe('A detailed analysis of general voting trends, including any unexpected patterns, anomalies, close contests, significant margins, or notable candidate performances.'),
  demographicInsights: z.string().describe('Insights derived from analyzing class-based turnout differences, highlighting areas of high and low engagement, and discussing potential influencing factors.'),
  recommendations: z.string().describe('Actionable suggestions for improving future election processes, engagement strategies, or addressing identified issues based on the current election outcomes.')
});
export type PostElectionAnalysisReportOutput = z.infer<typeof PostElectionAnalysisReportOutputSchema>;

/**
 * Defines the prompt for generating the post-election analysis report.
 * It instructs the AI to act as an expert election analyst and provides all necessary raw data
 * to create a comprehensive report according to the specified output schema.
 */
const postElectionAnalysisReportPrompt = ai.definePrompt({
  name: 'postElectionAnalysisReportPrompt',
  input: { schema: PostElectionAnalysisReportInputSchema },
  output: { schema: PostElectionAnalysisReportOutputSchema },
  prompt: `You are an expert election analyst tasked with generating a comprehensive post-election summary report for the "{{electionName}}".
Your goal is to provide a clear, insightful analysis of the final voting data, highlighting key statistics, unexpected voting patterns, and demographic insights, particularly class-based turnout differences.

Based on the provided data, generate a structured report.

---
Election Data:

Overall Statistics:
- Total Eligible Voters: {{{totalEligibleVoters}}}
- Total Votes Cast: {{{totalVotesCast}}}
- Overall Turnout Percentage: {{{overallTurnoutPercentage}}}%

Positions and Candidates Results:
{{#each positions}}
Position: {{{name}}} (ID: {{{id}}})
  Candidates:
  {{#each candidates}}
  - Name: {{{fullName}}}, Votes: {{{votes}}}, Percentage: {{{percentage}}}%
  {{/each}}
{{/each}}

Class Turnout Data:
{{#each classTurnout}}
- Class: {{{name}}} (ID: {{{id}}})
  - Population: {{{population}}}
  - Votes Cast: {{{votesCast}}}
  - Turnout Percentage: {{{turnoutPercentage}}}%
{{/each}}
---

Generate the report following this JSON structure, ensuring all fields are populated with relevant and concise information derived from the data.
Focus on identifying trends, anomalies, and providing actionable insights.
`
});

/**
 * Defines the Genkit flow for post-election analysis report generation.
 * This flow takes aggregated election data as input and uses an AI prompt
 * to produce a structured analysis report.
 */
const postElectionAnalysisReportFlow = ai.defineFlow(
  {
    name: 'postElectionAnalysisReportFlow',
    inputSchema: PostElectionAnalysisReportInputSchema,
    outputSchema: PostElectionAnalysisReportOutputSchema,
  },
  async (input) => {
    // Invoke the prompt with the provided input data to generate the report.
    const { output } = await postElectionAnalysisReportPrompt(input);
    // The prompt is configured to return the structured output directly, so we return it.
    return output!;
  }
);

/**
 * Exports a wrapper function to trigger the post-election analysis report generation flow.
 * This function provides a clean interface for calling the Genkit flow from other parts of the application.
 *
 * @param input The aggregated election data required for the report.
 * @returns A promise that resolves to the generated post-election analysis report.
 */
export async function generatePostElectionAnalysisReport(input: PostElectionAnalysisReportInput): Promise<PostElectionAnalysisReportOutput> {
  return postElectionAnalysisReportFlow(input);
}
