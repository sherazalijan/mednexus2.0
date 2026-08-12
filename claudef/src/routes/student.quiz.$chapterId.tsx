import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import { EmptyState } from "@/components/mednexus/EmptyState";
import { QueryError } from "@/components/mednexus/QueryError";
import { QuizRunner } from "@/components/mednexus/QuizRunner";
import { quizService } from "@/services/quiz.service";

export const Route = createFileRoute("/student/quiz/$chapterId")({
  head: () => ({
    meta: [
      { title: "Chapter Quiz — MedNexus" },
      { name: "description", content: "Answer chapter MCQs and submit for instant scoring and explanations." },
      { property: "og:title", content: "Chapter Quiz — MedNexus" },
      { property: "og:description", content: "Practise chapter MCQs on MedNexus." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuizPage,
});

function QuizPage() {
  const { chapterId } = Route.useParams();

  const quiz = useQuery({
    queryKey: ["chapter-quiz", chapterId],
    queryFn: () => quizService.getChapterQuiz(Number(chapterId), "sequential"),
  });

  if (quiz.isLoading) {
    return <div className="grid place-items-center py-24"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }

  if (quiz.isError) {
    return <QueryError error={quiz.error} onRetry={() => quiz.refetch()} title="Couldn't load this quiz" />;
  }

  const questions = quiz.data ?? [];
  if (questions.length === 0) {
    return <EmptyState icon={Send} title="No questions in this chapter" description="The chapter has no MCQs published yet." />;
  }

  return (
    <QuizRunner
      questions={questions}
      headerLabel={`Chapter #${chapterId}`}
      quizType="chapter"
      chapterId={Number(chapterId)}
    />
  );
}
