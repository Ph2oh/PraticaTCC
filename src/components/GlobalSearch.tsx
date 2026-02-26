import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Search, FileText, Users, Home, Calculator, BarChart2, Settings } from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import { useOrcamentos } from "@/hooks/useOrcamentos"
import { useClientes } from "@/hooks/useClientes"

export function GlobalSearch() {
    const [open, setOpen] = React.useState(false)
    const navigate = useNavigate()
    const { data: orcamentos = [] } = useOrcamentos()
    const { data: clientes = [] } = useClientes()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 hover:bg-accent hover:text-accent-foreground border border-border px-3 py-1.5 rounded-md transition-colors w-64 justify-between"
            >
                <span className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" />
                    Busca Rápida...
                </span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>

            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Digite um comando ou busque..." />
                <CommandList>
                    <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

                    <CommandGroup heading="Acesso Rápido">
                        <CommandItem onSelect={() => runCommand(() => navigate("/"))} className="cursor-pointer">
                            <Home className="mr-2 h-4 w-4 text-primary" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/orcamentos"))} className="cursor-pointer">
                            <Calculator className="mr-2 h-4 w-4 text-primary" />
                            <span>Orçamentos</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/clientes"))} className="cursor-pointer">
                            <Users className="mr-2 h-4 w-4 text-primary" />
                            <span>Clientes</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/relatorios"))} className="cursor-pointer">
                            <BarChart2 className="mr-2 h-4 w-4 text-primary" />
                            <span>Relatórios</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/configuracoes"))} className="cursor-pointer">
                            <Settings className="mr-2 h-4 w-4 text-primary" />
                            <span>Configurações</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Orçamentos Recentes">
                        {orcamentos.slice(0, 4).map(orc => (
                            <CommandItem
                                key={orc.id}
                                onSelect={() => runCommand(() => {
                                    navigate("/orcamentos");
                                    // No futuro, isso poderia abrir o drawer diretamente pelo hash da URL
                                })}
                                className="cursor-pointer"
                            >
                                <FileText className="mr-2 h-4 w-4 text-primary" />
                                <div className="flex flex-col">
                                    <span>{orc.descricao}</span>
                                    <span className="text-xs text-muted-foreground">{orc.cliente?.nome || "Cliente não informado"} • {orc.id}</span>
                                </div>
                            </CommandItem>
                        ))}
                    </CommandGroup>

                    <CommandSeparator />

                    <CommandGroup heading="Clientes">
                        {clientes.slice(0, 3).map(cli => (
                            <CommandItem
                                key={cli.id}
                                onSelect={() => runCommand(() => navigate("/clientes"))}
                                className="cursor-pointer"
                            >
                                <User className="mr-2 h-4 w-4 text-primary" />
                                <span>{cli.nome}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}

function User(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
}
