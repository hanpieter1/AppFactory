// Feedback model and DTOs

export interface Feedback {
  id: string;
  userId: string;
  subject: string;
  message: string;
  createdAt: Date;
}

export interface FeedbackWithUser extends Feedback {
  userName: string;
}

export interface CreateFeedbackDto {
  subject: string;
  message: string;
}
