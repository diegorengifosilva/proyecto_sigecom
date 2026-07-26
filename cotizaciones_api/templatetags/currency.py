from django import template

register = template.Library()


@register.filter
def moneda(valor, moneda):
    if valor is None:
        return ""

    try:
        valor = float(valor)
    except:
        return valor

    simbolo = "$" if moneda == "Dólares" else "S/."

    return f"{simbolo} {valor:,.2f}"


@register.filter
def format_custom(valor, simbolo=""):
    if valor is None or valor == "":
        return ""
    try:
        valor = float(valor)
    except:
        return valor
    
    formatted = f"{valor:,.2f}"
    if simbolo:
        return f"{simbolo} {formatted}"
    return formatted

