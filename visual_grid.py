# visual_grid.py — overlays a coordinate grid on every page so you can eyeball positions
import fitz

doc  = fitz.open("blank_aha_roster.pdf")
page = doc[0]
# Draw a grid every 50 points so you can read coordinates visually
for x in range(0, int(page.rect.width), 50):
    page.draw_line((x, 0), (x, page.rect.height), color=(0.8, 0.8, 0.8), width=0.5)
    page.insert_text((x+1, 10), str(x), fontsize=6, color=(0.5, 0.5, 0.5))
for y in range(0, int(page.rect.height), 50):
    page.draw_line((0, y), (page.rect.width, y), color=(0.8, 0.8, 0.8), width=0.5)
    page.insert_text((2, y+8), str(y), fontsize=6, color=(0.5, 0.5, 0.5))

doc.save("blank_aha_roster_GRID.pdf")
print("Grid PDF saved.")
