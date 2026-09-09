# Copyright 2026 Softwell S.r.l. - SPDX-License-Identifier: Apache-2.0
"""Explicit inventory of the current four Web Component collections."""
from .textbox import TextBoxTestPage
from .passwordbox import PasswordboxTestPage
from .numbertextbox import NumberTextBoxTestPage
from .datetextbox import DateTextBoxTestPage
from .timetextbox import TimeTextBoxTestPage
from .horizontalslider import HorizontalSliderTestPage
from .checkbox import CheckboxTestPage
from .panel import PanelTestPage
from .box import BoxTestPage
from .bordercontainer import BorderContainerTestPage
from .tabcontainer import TabContainerTestPage
from .tab import TabTestPage
from .colorpicker import ColorpickerTestPage
from .storetree import StoreTreeTestPage

from .palette import PaletteTestPage

from .filteringselect import FilteringSelectTestPage
from .combobox import ComboBoxTestPage

from .stackcontainer import StackContainerTestPage
from .stackbuttons import StackButtonsTestPage
from .button import ButtonTestPage
from .copybutton import CopyButtonTestPage

WIDGET_PAGES = {
    "widgets/copyButton": CopyButtonTestPage,
    "widgets/button": ButtonTestPage,
    "widgets/stackContainer": StackContainerTestPage,
    "widgets/stackButtons": StackButtonsTestPage,
    "widgets/filteringSelect": FilteringSelectTestPage,
    "widgets/comboBox": ComboBoxTestPage,
    "widgets/palette": PaletteTestPage,
    "widgets/textBox": TextBoxTestPage,
    "widgets/passwordbox": PasswordboxTestPage,
    "widgets/numberTextBox": NumberTextBoxTestPage,
    "widgets/dateTextBox": DateTextBoxTestPage,
    "widgets/timeTextBox": TimeTextBoxTestPage,
    "widgets/horizontalSlider": HorizontalSliderTestPage,
    "widgets/checkbox": CheckboxTestPage,
    "widgets/panel": PanelTestPage,
    "widgets/box": BoxTestPage,
    "widgets/borderContainer": BorderContainerTestPage,
    "widgets/tabContainer": TabContainerTestPage,
    "widgets/tab": TabTestPage,
    "widgets/colorpicker": ColorpickerTestPage,
    "widgets/storeTree": StoreTreeTestPage,
}
