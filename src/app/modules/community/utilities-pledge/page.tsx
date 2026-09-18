import type { Metadata } from "next";
import {
	ArrowTopRightOnSquareIcon,
	BoltIcon,
	BuildingOffice2Icon,
	CheckCircleIcon,
	FireIcon,
} from "@heroicons/react/24/outline";

const formUrl =
	"https://docs.google.com/forms/d/e/1FAIpQLSc2Anz6xM0a3EtvJG2CZXPcrg98lGaCKE0klB3c489ZGFboqw/viewform?usp=preview";

const utilityItems = [
	{
		name: "Electricity",
		description: "Lighting, heating, cooling, and daily operations.",
		icon: BoltIcon,
	},
	{
		name: "Water & facilities",
		description: "Wudu areas, restrooms, cleaning, and essential upkeep.",
		icon: BuildingOffice2Icon,
	},
	{
		name: "Year-round comfort",
		description: "A safe and welcoming space in every Colorado season.",
		icon: FireIcon,
	},
];

export const metadata: Metadata = {
	title: "Utility Donation Pledge | ICFC",
	description:
		"Pledge your support toward the Islamic Center of Fort Collins utility expenses.",
};

export default function UtilitiesPledgePage() {
	return (
		<main className="min-h-screen bg-[#f7f8f3] text-stone-900">
			<section className="relative overflow-hidden bg-primary px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
				<div
					className="absolute inset-0 opacity-10"
					style={{
						backgroundImage:
							"radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
						backgroundSize: "28px 28px",
					}}
					aria-hidden="true"
				/>
				<div className="relative mx-auto max-w-5xl text-center">
					<p className="mb-4 font-heading text-sm font-semibold uppercase tracking-[0.2em] text-secondary">
						Sustain our shared home
					</p>
					<h1 className="font-heading text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
						Utility Donation Pledge
					</h1>
					<p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-emerald-50 sm:text-xl">
						Help keep ICFC open, comfortable, and ready to serve our community
						every day. Your pledge supports the essential utility costs behind
						every prayer, class, gathering, and service.
					</p>
					<a
						href="#pledge-form"
						className="mt-8 inline-flex items-center justify-center rounded-md bg-secondary px-6 py-3 font-heading text-base font-bold text-stone-900 shadow-sm transition hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
					>
						Make a pledge
					</a>
				</div>
			</section>

			<section className="px-4 py-14 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-6xl">
					<div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
						<div>
							<p className="font-heading text-sm font-bold uppercase tracking-[0.16em] text-primary">
								Small pledges, lasting impact
							</p>
							<h2 className="mt-3 font-heading text-3xl font-bold text-stone-900 sm:text-4xl">
								Keep the masjid running, together
							</h2>
							<p className="mt-5 text-lg leading-8 text-stone-600">
								Reliable community pledges make recurring expenses easier to
								plan for and help direct more resources toward worship,
								education, and community care.
							</p>
							<div className="mt-6 flex items-start gap-3 border-l-4 border-secondary bg-white p-4 shadow-sm">
								<CheckCircleIcon
									className="mt-0.5 h-6 w-6 shrink-0 text-primary"
									aria-hidden="true"
								/>
								<p className="leading-7 text-stone-700">
									Choose a pledge that is comfortable for you. Every
									contribution helps provide a dependable foundation for ICFC.
								</p>
							</div>
						</div>


						<div className="grid gap-4 sm:grid-cols-3">
							{utilityItems.map((item) => {
								const Icon = item.icon;
								return (
									<article
										key={item.name}
										className="border-t-4 border-primary bg-white p-6 shadow-sm"
									>
										<div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-primary">
											<Icon className="h-6 w-6" aria-hidden="true" />
										</div>
										<h3 className="mt-5 font-heading text-lg font-bold">
											{item.name}
										</h3>
										<p className="mt-2 text-sm leading-6 text-stone-600">
											{item.description}
										</p>
									</article>
								);
							})}
						</div>
					</div>
				</div>
			</section>

			<section id="pledge-form" className="scroll-mt-6 px-4 pb-20 sm:px-6 lg:px-8">
				<div className="mx-auto max-w-5xl">
					<div className="mb-7 text-center">
						<p className="font-heading text-sm font-bold uppercase tracking-[0.16em] text-primary">
							Pledge form
						</p>
						<h2 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">
							Add your support
						</h2>
						<p className="mx-auto mt-3 max-w-2xl leading-7 text-stone-600">
							Complete the secure Google Form below. It only takes a few
							minutes to let us know how you would like to help.
						</p>
					</div>
					<div className="mt-6 flex flex-col items-center gap-3 text-center">
						<p className="text-sm text-stone-600">
							Having trouble viewing the embedded form?
						</p>
						<a
							href={formUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-2 rounded-md border-2 border-primary bg-white px-5 py-2.5 font-heading font-bold text-primary transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
						>
							Open the form in a new tab
							<ArrowTopRightOnSquareIcon className="h-5 w-5" aria-hidden="true" />
						</a>
						<br />
					</div>

					<div className="overflow-hidden border border-stone-200 bg-white shadow-md">
						<iframe
							src={`${formUrl}&embedded=true`}
							title="ICFC Utility Donation Pledge form"
							className="h-[980px] w-full"
							loading="lazy"
						>
							Loading pledge form...
						</iframe>
					</div>

				</div>
			</section>
		</main>
	);
}
