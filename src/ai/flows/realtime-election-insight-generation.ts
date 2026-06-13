'use server';
/**
 * @fileOverview An AI-powered tool for election administrators to gain real-time insights into voting trends.
 *
 * - realtimeElectionInsightGeneration - A function that provides analysis, predictions, and engagement strategies.
 * - RealtimeElectionInsightGenerationInput - The input type for the realtimeElectionInsightGeneration function.
 * - RealtimeElectionInsightGenerationOutput - The return type for the realtimeElectionInsightGeneration function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RealtimeElectionInsightGenerationInputSchema = z.object({
  totalEligibleVoters: z.number().describe('The total number of students eligible to vote.'),
  totalVotesCast: z.number().describe('The current total number of votes cast.'),
  votingTrendData: z.array(z.object({
    hour: z.number().min(0).max(23).describe('The hour of the day (0-23) in 24-hour format.'),
    votesInHour: z.number().describe('The number of votes cast during this specific hour.'),
  })).describe('An array of objects showing the number of votes cast per hour of the day.'),
  classVotingProgress: z.array(z.object({
    className: z.string().describe('The name of the class (e.g., Grade 6A).'),
    population: z.number().describe('The total student population of the class.'),
    votesCast: z.number().describe('The number of votes cast from this class.'),
  })).describe('An array of objects showing voting progress for each class.'),
  electionStatus: z.enum(['open', 'closed']).describe('The current status of the election (e.g., "open" or "closed").'),
});
export type RealtimeElectionInsightGenerationInput = z.infer<typeof RealtimeElectionInsightGenerationInputSchema>;

const RealtimeElectionInsightGenerationOutputSchema = z.object({
  summaryAnalysis: z.string().describe('A comprehensive analysis of the current voting trends and overall election status.'),
  peakVotingHours: z.array(z.number().min(0).max(23)).describe('A list of hours (0-23) identified as peak voting periods based on the provided data.'),
  predictedFinalTurnoutPercentage: z.number().min(0).max(100).describe('The predicted final voter turnout as a percentage of total eligible voters. This should be a numerical percentage (e.g., 75 for 75%).'),
  engagementStrategies: z.array(z.string()).describe('Actionable suggestions to boost voter engagement and turnout, especially for underperforming classes or during slow periods.'),
});
export type RealtimeElectionInsightGenerationOutput = z.infer<typeof RealtimeElectionInsightGenerationOutputSchema>;

export async function realtimeElectionInsightGeneration(input: RealtimeElectionInsightGenerationInput): Promise<RealtimeElectionInsightGenerationOutput> {
  return realtimeElectionInsightGenerationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'realtimeElectionInsightPrompt',
  input: { schema: RealtimeElectionInsightGenerationInputSchema },
  output: { schema: RealtimeElectionInsightGenerationOutputSchema },
  prompt: `You are an expert election analyst and strategist for the CIS Prefectorial Elections.
Your task is to analyze the provided real-time voting data, identify trends, predict the potential final turnout, and suggest strategies to optimize voter engagement.

### Current Election Data:
- Election Status: {{{electionStatus}}}
- Total Eligible Voters: {{{totalEligibleVoters}}}
- Total Votes Cast So Far: {{{totalVotesCast}}}

### Voting Trends by Hour (24-hour format):
{{#each votingTrendData}}
  - Hour {{hour}}: {{votesInHour}} votes
{{/each}}

### Class-wise Voting Progress:
{{#each classVotingProgress}}
  - Class: {{className}}, Population: {{population}}, Votes Cast: {{votesCast}} ({{(votesCast / population) * 100}}% turnout)
{{/each}}

Based on this data, provide:
1. A comprehensive summary analysis of the current voting trends and overall election status.
2. A list of peak voting hours.
3. The predicted final voter turnout percentage.
4. Actionable engagement strategies to boost turnout, especially for underperforming classes or during slow periods.

Ensure your output strictly adheres to the JSON schema provided.`,
});

const realtimeElectionInsightGenerationFlow = ai.defineFlow(
  {
    name: 'realtimeElectionInsightGenerationFlow',
    inputSchema: RealtimeElectionInsightGenerationInputSchema,
    outputSchema: RealtimeElectionInsightGenerationOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
