# Verificar que PC y laptop estan alineados con GitHub

Ejecuta esto en **ambas** maquinas, dentro de la carpeta del repo:

```powershell
git fetch origin
git status
git log -1 --oneline
git rev-parse HEAD
git rev-parse origin/main
```

## Que debe salir

| Comando | Significado |
|---------|-------------|
| `git status` | `On branch main` y **sin** "ahead" ni "behind" respecto a `origin/main` |
| `git log -1` | **Misma** linea en PC y laptop |
| `git rev-parse HEAD` y `origin/main` | **Mismo** hash (ej. `3e84dbc...`) |

Si `git status` dice **behind**: en esa maquina corre `git pull`.

Si dice **ahead** o **Changes not staged**: hay commits/cambios locales que aun no estan en GitHub. En la laptop, si Cursor edito archivos sin querer:

```powershell
git status
```

- Si solo querias bajar codigo y hay cambios que no hiciste a proposito:

```powershell
git checkout -- .
git pull
```

- Si hiciste cambios buenos a proposito:

```powershell
git add .
git commit -m "describe el cambio"
git push
```

Luego en la **otra** maquina: `git pull`.

## Regla de oro

1. **Empiezas** -> `git pull`
2. **Terminas** -> `git commit` + `git push`
3. **Compruebas** -> mismos hashes arriba

GitHub es la fuente de verdad; Railway despliega lo que esta en `main` en GitHub.
