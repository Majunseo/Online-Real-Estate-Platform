import { Link } from "react-router-dom";
import { MapPinOff } from "lucide-react";

function Message({ icon: Icon, title, body }: { icon: typeof MapPinOff; title: string; body: string }) {
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-20 text-center">
      <Icon className="h-14 w-14 text-muted" aria-hidden="true" />
      <h1 className="mt-5 text-3xl font-extrabold">{title}</h1>
      <p className="mt-3 text-lg text-muted">{body}</p>
      <Link to="/" className="btn-primary mt-8">
        첫 화면으로
      </Link>
    </section>
  );
}

/** 없는 주소 */
export function NotFoundPage() {
  return <Message icon={MapPinOff} title="페이지를 찾을 수 없어요" body="주소가 바뀌었거나 없는 페이지예요." />;
}
