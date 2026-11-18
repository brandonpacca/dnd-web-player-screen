# Schermo del Giocatore — D&D 5e

Companion per i giocatori dello [Schermo del Game Master](https://github.com/brandonpacca/dnd-web-gamemaster-screen). Sito statico in HTML/CSS/JS, senza build, con la stessa grafica in stile Homebrewery. Ogni giocatore lo apre sul proprio dispositivo e i dati restano nel `localStorage` del suo browser.

## Funzionalità

### Personaggio
- Più PG sullo stesso dispositivo: puoi crearli, duplicarli, eliminarli e passare dall'uno all'altro.
- Per ogni PG: nome, giocatore, razza con sottorazza (15 opzioni del Manuale del Giocatore 2014), classe (le 12 classi base) e livello.

### Template di razza e classe
- **Carica template** assegna la serie standard (15, 14, 13, 12, 10, 8) secondo le priorità della classe e sceglie i +1 liberi (Mezzelfo, Umano variante). Imposta anche le competenze nelle abilità consigliate, saltando quelle già date dalla razza.
- CA e PF vengono ricalcolati a partire dall'equipaggiamento iniziale della classe.
- Un'anteprima mostra prima tratti razziali, bonus, dado vita, tiri salvezza, priorità, CA iniziale e punteggi finali.

### Punteggi caratteristica
- Metodi: manuale, serie standard (con controllo di validità), acquisto a punti (contatore dei 27 punti) e tiro 4d6 scartando il dado più basso (i risultati vengono assegnati secondo le priorità della classe).
- Il totale è dato da base + bonus razziale + altri bonus (aumenti di caratteristica, talenti, oggetti).
- Cliccando sul modificatore si tira una prova.

### Statistiche
- CA, PF massimi, velocità, iniziativa, bonus di competenza, Percezione passiva, dado vita, CD e attacco degli incantesimi.
- CA, PF e velocità sono calcolati in automatico ma si possono sovrascrivere a mano; svuotando il campo si torna al valore calcolato.
- Tracciamento dei PF con danno, cura e PF temporanei.
- Tiri salvezza dati dalla classe. Le abilità hanno tre stati (nessuna competenza, competenza, maestria) e si tirano con un clic.

### Iniziativa
- Tiro d20 + bonus, normale, con vantaggio o con svantaggio, oppure inserimento a mano del risultato.
- Ordine di turno con gli altri partecipanti (PG o nemici), ordinato per iniziativa con spareggio sulla Destrezza.
- Controlli avanti/indietro e contatore dei round.
- Banner **"Tocca a te!"** quando è il turno di un tuo PG.

### Condividi col GM
- Riepilogo testuale da copiare (Nome, Razza, Classe, CA, PF, Iniziativa, caratteristiche, abilità), con i campi della tabella *Party* dello schermo del GM.
- Esportazione e importazione del PG in JSON. Il file contiene anche un oggetto `party` con lo stesso formato delle righe della tabella Party del GM, quindi è pronto per una futura importazione dallo schermo del GM.

## Utilizzo

Apri `index.html` nel browser oppure avvia un server statico:

```bash
python3 -m http.server 8000
```

## Struttura

```
index.html      Markup e sezioni
css/style.css   Grafica (stessa palette e font dello schermo del GM)
js/data.js      Dati 5e: razze, classi, abilità, serie standard, acquisto a punti
js/app.js       Stato, calcoli, template, iniziativa, condivisione
```
