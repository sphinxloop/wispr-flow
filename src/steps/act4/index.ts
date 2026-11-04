import type { Step } from '../../core/stateMachine';
import { act4IntroStep } from './act4Intro';
import { act4LetterStep } from './act4Letter';
import { act4ReplyStep } from './act4Reply';

export const act4Steps: Step[] = [act4IntroStep, act4LetterStep, act4ReplyStep];
