import type { Step } from '../../core/stateMachine';
import { act4IntroStep } from './act4Intro';
import { act4TransmissionStep } from './act4Transmission';
import { act4EndStep } from './act4End';

export const act4Steps: Step[] = [act4IntroStep, act4TransmissionStep, act4EndStep];
