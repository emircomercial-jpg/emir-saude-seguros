import { IsISO8601, IsNumber, Min } from 'class-validator';

export class SetSubscriptionDto {
  @IsNumber() @Min(0) subscriptionValue: number;
  @IsISO8601() subscriptionNextDueDate: string;
}
